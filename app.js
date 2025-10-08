// app.js (Restored to include path, i18n, cookieParser, and MongoStore)

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path'); // REQUIRED for views
const cookieParser = require('cookie-parser'); // REQUIRED for i18n and sessions
const i18n = require('i18n'); // REQUIRED for localization
const MongoStore = require('connect-mongo'); // REQUIRED for session storage

const app = express();
const PORT = process.env.PORT || 3000;
// Ensure User model is defined after mongoose is imported
const User = require('./models/User'); 

// Function to generate a random 4-digit number
function generateCaptcha() {
    return Math.floor(1000 + Math.random() * 9000);
}

// ------------------------------------------
// 1. I18N (LANGUAGE) CONFIGURATION
// ------------------------------------------
i18n.configure({
    locales: ['en', 'fr', 'es', 'de', 'ig', 'yo', 'ha'], 
    defaultLocale: 'en',
    directory: path.join(__dirname, 'locales'), 
    cookie: 'lang', 
    autoReload: true,
    syncFiles: true,
    updateFiles: true,
    register: global, 
});


// ------------------------------------------
// 2. MIDDLEWARE & SESSION SETUP
// ------------------------------------------
app.set('view engine', 'ejs');
// Define view paths: looks in 'views/' and 'views/pages/'
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'views/pages')]);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(cookieParser()); // Must be before i18n and session

// MONGODB CONNECTION
const dbURI = process.env.MONGODB_URI; 
if (!dbURI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in .env');
    process.exit(1);
}

// Mongoose connection and Server start
mongoose.connect(dbURI)
    .then(() => {
        console.log('✅ MongoDB Connected successfully!');
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}.`);
            console.log(`🔗 Access at: http://localhost:${PORT}`);
        });
    })
    .catch((err) => console.error('🔴 Database connection error:', err));


// SESSION SETUP (Must use MongoStore with full config)
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret', 
    resave: false,
    saveUninitialized: false, 
    store: MongoStore.create({ mongoUrl: dbURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Initialize i18n middleware AFTER cookie-parser and session
app.use(i18n.init); 

// Custom Middleware to set current path and locale for EJS
app.use((req, res, next) => {
    if (req.query.lang && req.query.lang !== req.locale) {
        res.cookie(i18n.options.cookie, req.query.lang, { maxAge: 1000 * 60 * 60 * 24 });
        req.setLocale(req.query.lang);
        return res.redirect(req.path); 
    }
    res.locals.locale = req.locale; 
    res.locals.currentUrl = req.originalUrl.split('?')[0]; 
    next();
});


// --- AUTHENTICATION MIDDLEWARES ---

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        req.session.touch(); 
        next(); 
    } else {
        req.session.error = __("You must be logged in to view that page.");
        res.redirect('/login'); 
    }
};

const requireAdmin = async (req, res, next) => {
    if (!req.session.userId) {
        req.session.error = __("You must be logged in to access that page.");
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId);

        if (user && user.isAdmin) {
            req.user = user; 
            next();
        } else {
            req.session.error = __("Access Denied. Only Administrators can view that page.");
            res.status(403).redirect('/home'); 
        }
    } catch (err) {
        console.error('Admin check error:', err);
        res.status(500).redirect('/login');
    }
};


// ------------------------------------------
// 3. AUTHENTICATION & CORE ROUTES
// ------------------------------------------

// ROUTE: LANDING PAGE (ROOT)
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/home');
    } else {
        res.redirect('/register');
    }
});

// ROUTE: DISPLAY REGISTRATION PAGE - This is 100% correct.
app.get('/register', (req, res) => {
    const captchaCode = generateCaptcha(); 
    req.session.captcha = captchaCode.toString(); 

    res.render('register', { 
        title: __('Register'),
        captcha: captchaCode,
        error: req.session.error
    }); 
    req.session.error = null;
});

// ROUTE: HANDLE REGISTRATION SUBMISSION (POST)
app.post('/register', async (req, res) => {
    const { countryCode, phoneNumber, password, confirmPassword, userCaptcha, agreement } = req.body;
    
    // CAPTCHA, AGREEMENT, PASSWORD check logic
    if (userCaptcha !== req.session.captcha) {
        req.session.error = __("Verification code is invalid or expired.");
        return res.redirect('/register');
    }
    if (password !== confirmPassword) {
        req.session.error = __("Passwords do not match.");
        return res.redirect('/register');
    }
    if (agreement !== 'on') { 
        req.session.error = __("You must agree to the User Agreement.");
        return res.redirect('/register');
    }

    try {
        await User.create({ countryCode, phoneNumber, password });
        delete req.session.captcha; 
        req.session.error = __("Registration successful. Please log in.");
        res.redirect('/login'); 
    } catch (err) {
        if (err.code === 11000) { 
            req.session.error = __("This phone number is already registered.");
        } else {
            req.session.error = __("Registration failed due to a server error.");
        }
        res.redirect('/register');
    }
});

// ROUTE: DISPLAY LOGIN PAGE - This is 100% correct.
app.get('/login', (req, res) => {
    res.render('login', { 
        title: __('Login'),
        error: req.session.error 
    }); 
    req.session.error = null;
});

// ROUTE: HANDLE LOGIN SUBMISSION (POST)
app.post('/login', async (req, res) => {
    const { phoneNumber, password } = req.body;
    
    try {
        const user = await User.findOne({ phoneNumber });

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id; 
            res.redirect('/home');
        } else {
            req.session.error = __("Incorrect phone number or password.");
            res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        req.session.error = __("An error occurred during login.");
        res.redirect('/login');
    }
});

// ROUTE: LOGOUT 
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout failed:', err);
            return res.status(500).json({ success: false, message: 'Server failed to clear session.' });
        }
        res.clearCookie('connect.sid'); 
        res.json({ success: true, redirect: '/register' }); 
    });
});


// ------------------------------------------
// 4. APPLICATION ROUTES (PROTECTED)
// ------------------------------------------

app.get('/home', requireAuth, (req, res) => {
    res.render('home', { title: __('Home Dashboard') }); 
});

app.get('/invest', requireAuth, (req, res) => {
    res.render('invest', { title: __('Investment') });
});

app.get('/alliance', requireAuth, (req, res) => {
    res.render('alliance', { title: __('Alliance') });
});

app.get("/invest1", (req, res) => {
  res.render("invests/invest1");
});

app.get("/invest2", (req, res) => {
  res.render("invests/invest2");
});

app.get("/invest3", (req, res) => {
  res.render("invests/invest3");
});

app.get("/invest4", (req, res) => {
  res.render("invests/invest4");
});

app.get("/invest5", (req, res) => {
  res.render("invests/invest5");
});

app.get('/profile', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.userId).lean();
    res.render('profile', { 
        title: __('Profile'),
        user: user
    });
});

app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments(); 
        
        res.render('admin', { 
            title: __('Admin Dashboard'),
            totalUsers: totalUsers,
        });
    } catch (err) {
        console.error('Error fetching admin data:', err);
        res.status(500).render('404', { title: __('Server Error') });
    }
});



// ------------------------------------------
// 5. ERROR ROUTE
// ------------------------------------------
app.use((req, res) => {
    res.status(404).render('404', { title: __('404 Not Found') });
});
