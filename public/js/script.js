// Ensure this code runs after the entire HTML is loaded
document.addEventListener('DOMContentLoaded', () => {
    const slides = document.getElementById("slides");
    const dotsContainer = document.getElementById("dots");

    // Check if the essential elements exist before proceeding
    if (!slides || !dotsContainer) {
        console.error("Slider elements not found (slides or dots container).");
        return; 
    }

    const totalSlides = slides.children.length;
    let index = 0;
    
    // --- DOTS LOGIC ---
    // Create dots dynamically
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement("span");
        dot.classList.add("dot");
        if (i === 0) dot.classList.add("active");
        dotsContainer.appendChild(dot);
    }

    const dots = document.querySelectorAll(".dot");

    function updateDots() {
        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === index);
        });
    }

    // --- SLIDE MOVEMENT LOGIC ---
    function showSlide() {
        // Calculate the translateX value (e.g., 0%, -100%, -200%...)
        slides.style.transform = `translateX(-${index * 100}%)`;
        updateDots();
        
        // Prepare for the next slide (circular loop)
        index = (index + 1) % totalSlides;
    }

    // Initial slide display
    showSlide();

    // Run only on small screens (as per your original request, otherwise it runs on all)
    // You may want to remove the innerWidth check if the slider is for all screen sizes
    if (window.innerWidth <= 768) {
        setInterval(showSlide, 3000); // Change slide every 3 seconds
    } else {
        // Ensure it stops auto-sliding on large screens if desired
        // If you want it to auto-slide on all screens, just remove the 'if' block.
    }

    // --- NOTICE POPUP LOGIC (Added for completeness) ---
    const noticeOpen = document.getElementById('notice_open');
    const noticeClose = document.getElementById('notice_close');
    const noticeModal = document.getElementById('notice');

    if (noticeOpen && noticeClose && noticeModal) {
        noticeOpen.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            noticeModal.style.display = 'block';
        });

        noticeClose.addEventListener('click', () => {
            noticeModal.style.display = 'none';
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {

    // 1. Referral Rewards / Claim Popup Logic
    const rewardsPopup = document.getElementById('rewards');
    const rewardsOpenButton = document.getElementById('rewards_open');
    const rewardsCloseButton = document.getElementById('rewards_close');

    if (rewardsPopup && rewardsOpenButton && rewardsCloseButton) {
        // Initially hide the popup using CSS (it's often better to control visibility via CSS classes)
        rewardsPopup.style.display = 'none';

        // Open the popup
        rewardsOpenButton.addEventListener('click', () => {
            rewardsPopup.style.display = 'block';
            rewardsPopup.classList.add('active'); // Use a class for transitions if you have them
        });

        // Close the popup
        rewardsCloseButton.addEventListener('click', () => {
            rewardsPopup.classList.remove('active');
            // Hide after a brief delay if you use CSS transitions/animations, otherwise hide immediately:
            rewardsPopup.style.display = 'none';
        });
    }

    // 2. Commission Details / View More Popup Logic
    const noticePopup = document.getElementById('notice');
    const noticeOpenButton = document.getElementById('notice_open');
    const noticeCloseButton = document.getElementById('notice_close');

    if (noticePopup && noticeOpenButton && noticeCloseButton) {
        // Initially hide the popup
        noticePopup.style.display = 'none';

        // Open the popup
        noticeOpenButton.addEventListener('click', () => {
            noticePopup.style.display = 'block';
            noticePopup.classList.add('active');
        });

        // Close the popup
        noticeCloseButton.addEventListener('click', () => {
            noticePopup.classList.remove('active');
            noticePopup.style.display = 'none';
        });
    }


    // 3. Copy Referral Code and Link Logic
    const copyButtons = document.querySelectorAll('.cards_alliance button');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Get the sibling span that contains the code/link
            const spanToCopy = event.target.previousElementSibling;
            
            if (spanToCopy) {
                const textToCopy = spanToCopy.innerText.trim();
                
                // Use the modern clipboard API
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Provide feedback to the user
                    const originalText = event.target.innerText;
                    event.target.innerText = 'Copied!';
                    
                    // Revert the button text after 2 seconds
                    setTimeout(() => {
                        event.target.innerText = originalText;
                    }, 2000);

                }).catch(err => {
                    // Fallback for older browsers or security issues (e.g., alert or console log)
                    console.error('Could not copy text: ', err);
                    alert(`Could not copy. Please manually copy this: ${textToCopy}`);
                });
            }
        });
    });

});



// Add to your existing document.addEventListener('DOMContentLoaded', () => { ... });

function checkScreenSize() {
    const minWidth = 769; // Must match the CSS media query
    const warning = document.getElementById('mobile-only-warning');

    if (window.innerWidth >= minWidth) {
        // Warning is handled by CSS, but you can add class logic here if needed
        console.log("Desktop detected. Mobile-only warning is active.");
    } else {
        // On mobile screen sizes
        if (warning) {
             warning.style.display = 'none';
        }
    }
}

// Check size on load and on resize
checkScreenSize();
window.addEventListener('resize', checkScreenSize);


