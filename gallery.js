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
    // Skip grid sizing on mobile — CSS flexbox handles layout
    if (isMobile()) return;

    const { gap, rowHeight, colWidth } = getGridMetrics();
    const ratio = img.naturalWidth / img.naturalHeight;

    let colSpan = 1;
    // ~30% of landscape images span 2 columns for prominence
    if (ratio > 1.2 && Math.random() > 0.7) {
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
    let loadedCount = 0;

    items.forEach(item => {
        const img = item.querySelector('img');
        if (!img) return;

        const onReady = () => {
            img.classList.add('loaded');
            sizeItem(item, img);
            loadedCount++;
            if (loadedCount >= items.length) {
                balanceGrid();
            }
        };

        if (img.complete && img.naturalWidth > 0) {
            onReady();
        } else {
            img.addEventListener('load', onReady);
        }
    });
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
        const featuredImg = document.getElementById('featured-img');
        if (featuredImg) {
            featuredImg.src = img.src;
            randomItem.classList.add('selected');
        }
    }
}

// Add click-to-select listeners to gallery items
function initGalleryClicks() {
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

    // Skip scroll lock on mobile — horizontal strip scrolls naturally
    if (isMobile()) return;

    galleryScroll.addEventListener('wheel', (e) => {
        // Only trap scroll when the gallery is mostly visible in the viewport
        const rect = galleryScroll.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        if (visibleHeight <= 0 || visibleHeight < rect.height * 0.75) {
            return; // gallery is mostly off-screen, let the page scroll
        }

        const { scrollTop, scrollHeight, clientHeight } = galleryScroll;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
        const atTop = scrollTop <= 2;
        const scrollingDown = e.deltaY > 0;
        const scrollingUp = e.deltaY < 0;

        // At boundary scrolling outward — let the page scroll
        if ((atBottom && scrollingDown) || (atTop && scrollingUp)) {
            return;
        }

        // Otherwise trap the scroll inside the gallery
        e.preventDefault();
        galleryScroll.scrollTop += e.deltaY;
    }, { passive: false });
}

// Auto-scroll the horizontal thumbnail strip on mobile
function initMobileAutoScroll() {
    if (!isMobile()) return;

    const galleryScroll = document.querySelector('.gallery-scroll');
    if (!galleryScroll) return;

    const speed = 0.25; // pixels per frame
    let animationId = null;
    let paused = false;

    function step() {
        if (!paused) {
            galleryScroll.scrollLeft += speed;

            // Loop back to start when reaching the end
            const maxScroll = galleryScroll.scrollWidth - galleryScroll.clientWidth;
            if (galleryScroll.scrollLeft >= maxScroll) {
                galleryScroll.scrollLeft = 0;
            }
        }
        animationId = requestAnimationFrame(step);
    }

    // Pause while the user is touching/swiping
    galleryScroll.addEventListener('touchstart', () => { paused = true; });
    galleryScroll.addEventListener('touchend', () => {
        setTimeout(() => { paused = false; }, 2000);
    });

    animationId = requestAnimationFrame(step);
}

// Run shuffle and init when page loads
window.addEventListener('DOMContentLoaded', () => {
    shuffleGallery();
    classifyAndBalanceGrid();
    initFeaturedImage();
    initGalleryClicks();
    initGalleryScrollLock();
    initMobileAutoScroll();
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
