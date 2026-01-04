// Hero video sector switching
let currentSector = 'commercial';
let currentVideoIndex = 0;
const allVideos = document.querySelectorAll('.hero-video');
const sectorButtons = document.querySelectorAll('.sector-btn');

// Set first button as active
sectorButtons[0].classList.add('active');

// Check if video file actually exists
function videoExists(video) {
    return new Promise((resolve) => {
        const testVideo = document.createElement('video');
        testVideo.addEventListener('loadedmetadata', () => resolve(true));
        testVideo.addEventListener('error', () => resolve(false));
        testVideo.src = video.querySelector('source').src;
    });
}

// Get videos for a specific sector (only ones that exist)
async function getSectorVideos(sector) {
    const videos = Array.from(allVideos).filter(video =>
        video.getAttribute('data-sector') === sector
    );

    // Sort by data-index to ensure correct order
    videos.sort((a, b) => {
        const indexA = parseInt(a.getAttribute('data-index')) || 0;
        const indexB = parseInt(b.getAttribute('data-index')) || 0;
        return indexA - indexB;
    });

    // Check which videos actually exist
    const existingVideos = [];
    for (const video of videos) {
        const exists = await videoExists(video);
        if (exists) {
            existingVideos.push(video);
        }
    }

    return existingVideos;
}

// Play next video in current sector
async function playNextVideo() {
    const sectorVideos = await getSectorVideos(currentSector);
    if (sectorVideos.length === 0) return;

    // Stop and hide all videos first
    allVideos.forEach(v => {
        v.pause();
        v.currentTime = 0;
        v.classList.remove('active');
    });

    // If only one video, just loop it
    if (sectorVideos.length === 1) {
        sectorVideos[0].classList.add('active');
        sectorVideos[0].play();
        return;
    }

    // Cycle to next video
    currentVideoIndex = (currentVideoIndex + 1) % sectorVideos.length;
    const nextVideo = sectorVideos[currentVideoIndex];

    nextVideo.classList.add('active');
    nextVideo.currentTime = 0;
    nextVideo.play();
}

// When any video ends, play next one in sector
allVideos.forEach(video => {
    video.addEventListener('ended', playNextVideo);
});

// Sector button clicks
sectorButtons.forEach(button => {
    button.addEventListener('click', async () => {
        const sector = button.getAttribute('data-sector');

        // Update active button
        sectorButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Switch to new sector
        currentSector = sector;
        currentVideoIndex = 0;

        // Stop and hide all videos
        allVideos.forEach(v => {
            v.pause();
            v.currentTime = 0;
            v.classList.remove('active');
        });

        // Show first video of selected sector (only if it exists)
        const sectorVideos = await getSectorVideos(sector);
        if (sectorVideos.length > 0) {
            sectorVideos[0].classList.add('active');
            sectorVideos[0].currentTime = 0;
            sectorVideos[0].play();
        }

        // Update description text
        const allDescriptions = document.querySelectorAll('.description-text');
        allDescriptions.forEach(desc => desc.style.display = 'none');
        const activeDescription = document.querySelector(`.description-text[data-sector="${sector}"]`);
        if (activeDescription) {
            activeDescription.style.display = 'block';
        }
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');

        // Special handling for scrolling to top
        if (href === '#top' || href === '#') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            return;
        }

        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background on scroll
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add shadow when scrolled
    if (currentScroll > 50) {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    } else {
        navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// Mobile menu toggle functionality
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

mobileMenuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    });
});

// Contact form handling
const contactForm = document.querySelector('.contact-form');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get form data
    const formData = new FormData(contactForm);

    // Here you would typically send the form data to a server
    // For now, we'll just show a success message
    alert('Thank you for your message! We will get back to you soon.');

    // Reset form
    contactForm.reset();
});

// Add active state to nav links based on scroll position
const sections = document.querySelectorAll('section[id]');

function highlightNavLink() {
    const scrollPosition = window.pageYOffset;

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', highlightNavLink);

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe portfolio items
document.querySelectorAll('.portfolio-item').forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(item);
});
