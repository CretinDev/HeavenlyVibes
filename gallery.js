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

// Get grid metrics from the live layout
function getGridMetrics() {
    const gallery = document.querySelector('.masonry-gallery');
    const style = getComputedStyle(gallery);
    const gap = parseFloat(style.gap) || 12;
    const rowHeight = parseFloat(style.gridAutoRows) || 10;
    const columns = style.gridTemplateColumns.split(' ').length;
    const colWidth = (gallery.clientWidth - (columns - 1) * gap) / columns;
    return { gap, rowHeight, colWidth, columns };
}

// Check if we're on mobile
function isMobile() {
    return window.innerWidth <= 768;
}

// Set a single item's row/column span based on its natural aspect ratio
function sizeItem(item, img) {
    if (img.naturalWidth === 0) return;

    const { gap, rowHeight, colWidth } = getGridMetrics();
    const ratio = img.naturalWidth / img.naturalHeight;

    let colSpan = 1;
    // ~30% of landscape images span 2 columns for prominence (desktop only)
    if (!isMobile() && ratio > 1.2 && Math.random() > 0.7) {
        colSpan = 2;
        item.style.gridColumn = 'span 2';
        item.dataset.wide = 'true';
    }

    const itemWidth = colSpan === 2 ? (colWidth * 2 + gap) : colWidth;
    const naturalHeight = itemWidth / ratio;
    const rowSpan = Math.ceil((naturalHeight + gap) / (rowHeight + gap));
    item.style.gridRow = 'span ' + rowSpan;
}

// Classify all images — size them as they load, then rebalance
function classifyAndBalanceGrid() {
    const items = Array.from(document.querySelectorAll('.gallery-item'));
    let balanceTimer = null;

    items.forEach(item => {
        const img = item.querySelector('img');
        if (!img) return;

        const onReady = () => {
            img.classList.add('loaded');
            sizeItem(item, img);
            // Debounce balanceGrid so it runs once after a batch of images load
            clearTimeout(balanceTimer);
            balanceTimer = setTimeout(balanceGrid, 150);
        };

        if (img.complete && img.naturalWidth > 0) {
            onReady();
        } else {
            img.addEventListener('load', onReady);
        }
    });
}

// Lazy load images using IntersectionObserver on the scroll container
// Skipped on mobile since the masonry grid is hidden
function initLazyLoad() {
    if (isMobile()) return;

    const scrollContainer = document.querySelector('.gallery-scroll');
    const images = document.querySelectorAll('.gallery-item img[data-src]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                // Skip if already loaded (e.g. by initFeaturedImage)
                if (!img.dataset.src) {
                    observer.unobserve(img);
                    return;
                }
                const src = img.dataset.src;
                img.removeAttribute('data-src');
                img.src = src;
                img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
                if (img.complete && img.naturalWidth > 0) {
                    img.classList.add('loaded');
                }
                observer.unobserve(img);
            }
        });
    }, {
        root: scrollContainer,
        rootMargin: '200px 0px'
    });

    images.forEach(img => observer.observe(img));
}

// Cap 2-column items at 20% of gallery, downgrade excess to single-column
function balanceGrid() {
    const items = document.querySelectorAll('.gallery-item');
    const wideItems = Array.from(document.querySelectorAll('.gallery-item[data-wide="true"]'));
    const maxWide = Math.floor(items.length * 0.2);

    if (wideItems.length > maxWide) {
        // Shuffle so we trim randomly
        for (let i = wideItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wideItems[i], wideItems[j]] = [wideItems[j], wideItems[i]];
        }
        const { gap, rowHeight, colWidth } = getGridMetrics();
        wideItems.slice(maxWide).forEach(item => {
            item.style.gridColumn = '';
            delete item.dataset.wide;
            const img = item.querySelector('img');
            if (img && img.naturalWidth > 0) {
                const ratio = img.naturalWidth / img.naturalHeight;
                const naturalHeight = colWidth / ratio;
                const rowSpan = Math.ceil((naturalHeight + gap) / (rowHeight + gap));
                item.style.gridRow = 'span ' + rowSpan;
            }
        });
    }
}

// Set the featured image with a fade transition
function setFeaturedImage(src, selectedItem) {
    const featuredImg = document.getElementById('featured-img');
    if (!featuredImg) return;

    // Remove selected class from all items
    document.querySelectorAll('.gallery-item.selected').forEach(item => {
        item.classList.remove('selected');
    });

    // Add selected class to clicked item
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    // Fade out, swap, fade in
    featuredImg.classList.add('fade-out');
    setTimeout(() => {
        featuredImg.src = src;
        featuredImg.onload = () => {
            featuredImg.classList.remove('fade-out');
        };
        // Fallback in case image is cached and onload doesn't fire
        if (featuredImg.complete) {
            featuredImg.classList.remove('fade-out');
        }
    }, 200);
}

// Initialize featured image with a random gallery photo
function initFeaturedImage() {
    const items = document.querySelectorAll('.gallery-item');
    if (items.length === 0) return;

    const randomIndex = Math.floor(Math.random() * items.length);
    const randomItem = items[randomIndex];
    const img = randomItem.querySelector('img');

    if (img) {
        // Force-load this image if it hasn't been lazy-loaded yet
        if (img.dataset.src) {
            const src = img.dataset.src;
            img.removeAttribute('data-src');
            img.src = src;
            // Ensure loaded class is applied for opacity transition
            img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
            if (img.complete && img.naturalWidth > 0) {
                img.classList.add('loaded');
            }
        }
        const featuredImg = document.getElementById('featured-img');
        if (featuredImg) {
            featuredImg.src = img.src;
            randomItem.classList.add('selected');
        }
    }
}

// Add click-to-select listeners to gallery items
function initGalleryClicks() {
    if (isMobile()) return; // mobile uses lightbox instead

    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('img');
            if (img) {
                setFeaturedImage(img.src, item);
            }
        });
    });
}

// Lock page scroll while gallery-scroll has content to scroll
function initGalleryScrollLock() {
    const galleryScroll = document.querySelector('.gallery-scroll');
    if (!galleryScroll) return;

    if (isMobile()) return;

    galleryScroll.addEventListener('wheel', (e) => {
        const rect = galleryScroll.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        if (visibleHeight <= 0 || visibleHeight < rect.height * 0.75) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = galleryScroll;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
        const atTop = scrollTop <= 2;
        const scrollingDown = e.deltaY > 0;
        const scrollingUp = e.deltaY < 0;

        if ((atBottom && scrollingDown) || (atTop && scrollingUp)) {
            return;
        }

        e.preventDefault();
        galleryScroll.scrollTop += e.deltaY;
    }, { passive: false });
}

// Mobile slideshow with arrows and auto-cycle
// Uses a curated set of images from assets/gallery-mobile/ for fast loading
function initMobileSlideshow() {
    if (!isMobile()) return;

    const slideshowImg = document.querySelector('.slideshow-img');
    const prevBtn = document.querySelector('.slideshow-prev');
    const nextBtn = document.querySelector('.slideshow-next');
    if (!slideshowImg || !prevBtn || !nextBtn) return;

    let sources = [];
    let currentIndex = 0;
    let autoTimer = null;

    function showImage(index) {
        slideshowImg.classList.add('fade');
        setTimeout(() => {
            slideshowImg.src = sources[index];
            slideshowImg.onload = () => {
                slideshowImg.classList.remove('fade');
            };
            if (slideshowImg.complete) {
                slideshowImg.classList.remove('fade');
            }
        }, 300);
    }

    function nextImage() {
        if (sources.length === 0) return;
        currentIndex = (currentIndex + 1) % sources.length;
        showImage(currentIndex);
    }

    function prevImage() {
        if (sources.length === 0) return;
        currentIndex = (currentIndex - 1 + sources.length) % sources.length;
        showImage(currentIndex);
    }

    function resetAutoTimer() {
        clearInterval(autoTimer);
        autoTimer = setInterval(nextImage, 3650);
    }

    // Fetch the mobile gallery manifest and start slideshow
    fetch('assets/gallery-mobile/manifest.json')
        .then(res => res.json())
        .then(filenames => {
            sources = filenames.map(f => 'assets/gallery-mobile/' + f);
            if (sources.length === 0) return;

            // Shuffle the order
            for (let i = sources.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sources[i], sources[j]] = [sources[j], sources[i]];
            }

            currentIndex = 0;
            slideshowImg.src = sources[currentIndex];
            autoTimer = setInterval(nextImage, 3650);
        })
        .catch(() => {
            // Fallback: use gallery items if manifest is missing
            const items = document.querySelectorAll('.gallery-item img');
            sources = Array.from(items).map(img => img.dataset.src || img.src).filter(Boolean);
            if (sources.length === 0) return;
            currentIndex = Math.floor(Math.random() * sources.length);
            slideshowImg.src = sources[currentIndex];
            autoTimer = setInterval(nextImage, 3650);
        });

    // Arrow clicks
    nextBtn.addEventListener('click', () => {
        nextImage();
        resetAutoTimer();
    });

    prevBtn.addEventListener('click', () => {
        prevImage();
        resetAutoTimer();
    });
}

// Run shuffle and init when page loads
window.addEventListener('DOMContentLoaded', () => {
    if (isMobile()) {
        // Mobile: only init the lightweight slideshow
        initMobileSlideshow();
    } else {
        // Desktop: full gallery experience
        shuffleGallery();
        initLazyLoad();
        classifyAndBalanceGrid();
        initFeaturedImage();
        initGalleryClicks();
        initGalleryScrollLock();
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
        if (mobileMenuToggle) {
            mobileMenuToggle.classList.remove('active');
        }
    });
});
