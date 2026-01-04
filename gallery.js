// Gallery page JavaScript

// Randomize gallery on page load
function shuffleGallery() {
    const gallery = document.querySelector('.masonry-gallery');
    const items = Array.from(gallery.children);

    // Shuffle array using Fisher-Yates algorithm
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    // Clear gallery and re-append in random order
    gallery.innerHTML = '';
    items.forEach(item => gallery.appendChild(item));
}

// Add loaded class to images when they finish loading
function handleImageLoad() {
    const images = document.querySelectorAll('.gallery-item img');
    images.forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
        }
    });
}

// Run shuffle when page loads
window.addEventListener('DOMContentLoaded', () => {
    shuffleGallery();
    handleImageLoad();
});

// Navbar background on scroll
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add shadow when scrolled
    if (currentScroll > 50) {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    } else {
        navbar.style.boxShadow = 'none';
    }
});

// Mobile menu toggle functionality
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    });
});

// Optional: Lightbox functionality for clicking on gallery items
const galleryItems = document.querySelectorAll('.gallery-item');
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
document.body.appendChild(lightbox);

const lightboxClose = document.createElement('span');
lightboxClose.className = 'lightbox-close';
lightboxClose.innerHTML = '&times;';
lightbox.appendChild(lightboxClose);

galleryItems.forEach(item => {
    const img = item.querySelector('img');
    if (img) {
        item.addEventListener('click', () => {
            const imgClone = img.cloneNode(true);

            // Remove any existing image in lightbox
            const existingImg = lightbox.querySelector('img');
            if (existingImg) {
                existingImg.remove();
            }

            lightbox.appendChild(imgClone);
            lightbox.classList.add('active');
        });
    }
});

// Close lightbox
lightboxClose.addEventListener('click', () => {
    lightbox.classList.remove('active');
});

lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        lightbox.classList.remove('active');
    }
});

// Close lightbox with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        lightbox.classList.remove('active');
    }
});
