// Hero video sector switching
let currentSector = 'default';
let currentVideoIndex = 0;
let recentVideoHistory = []; // Track recent videos to avoid flip-flopping
const allVideos = document.querySelectorAll('.hero-video');
const sectorButtons = document.querySelectorAll('.sector-btn');
let cachedSectorVideos = {}; // Cache video lists to avoid repeated checks

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
    // Return cached result if available
    if (cachedSectorVideos[sector]) {
        return cachedSectorVideos[sector];
    }

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

    // Cache the result
    cachedSectorVideos[sector] = existingVideos;
    return existingVideos;
}

// Preload the next video to avoid flicker
function preloadNextVideo(sectorVideos) {
    if (sectorVideos.length <= 1) return;

    let nextIndex;
    if (currentSector === 'default') {
        // For default sector, preload a random video that's not current
        do {
            nextIndex = Math.floor(Math.random() * sectorVideos.length);
        } while (nextIndex === currentVideoIndex);
    } else {
        // For other sectors, preload the next sequential video
        nextIndex = (currentVideoIndex + 1) % sectorVideos.length;
    }

    const nextVideo = sectorVideos[nextIndex];
    if (nextVideo && nextVideo.readyState < 4) {
        nextVideo.load(); // Preload the video to have enough buffered data
    }
}

// Play next video in current sector
async function playNextVideo() {
    const sectorVideos = await getSectorVideos(currentSector);
    if (sectorVideos.length === 0) return;

    // If only one video, just loop it
    if (sectorVideos.length === 1) {
        sectorVideos[0].currentTime = 0;
        sectorVideos[0].play().catch(() => {});
        return;
    }

    // Store current video before changing index
    const currentVideo = sectorVideos[currentVideoIndex];

    // For default sector, pick random video (avoid recent ones)
    if (currentSector === 'default') {
        let randomIndex;
        let attempts = 0;
        const maxAttempts = 50; // Prevent infinite loop

        // Keep history of last 2-3 videos depending on total count
        const historySize = Math.min(Math.floor(sectorVideos.length / 2), 3);

        do {
            randomIndex = Math.floor(Math.random() * sectorVideos.length);
            attempts++;
        } while (recentVideoHistory.includes(randomIndex) && attempts < maxAttempts);

        // Update history - add new index and keep only recent ones
        recentVideoHistory.push(randomIndex);
        if (recentVideoHistory.length > historySize) {
            recentVideoHistory.shift(); // Remove oldest
        }

        currentVideoIndex = randomIndex;
    } else {
        // For other sectors, cycle sequentially
        currentVideoIndex = (currentVideoIndex + 1) % sectorVideos.length;
    }

    const nextVideo = sectorVideos[currentVideoIndex];

    // Prepare next video and ensure it's ready
    nextVideo.currentTime = 0;

    // Start playing the next video first, then hide others once it's actually playing
    nextVideo.play().then(() => {
        // Video is now playing, make it visible instantly (no fade-in class, just opacity)
        nextVideo.classList.add('active');
        nextVideo.style.transition = 'none';
        nextVideo.style.opacity = '1';

        // Hide all other videos
        allVideos.forEach(v => {
            if (v !== nextVideo) {
                v.classList.remove('active', 'fade-in');
                v.pause();
                v.currentTime = 0;
                v.style.opacity = '';
                v.style.transition = '';
            }
        });
    }).catch(() => {
        // If play fails, still try to show it
        nextVideo.classList.add('active');
        nextVideo.style.transition = 'none';
        nextVideo.style.opacity = '1';
        allVideos.forEach(v => {
            if (v !== nextVideo) {
                v.classList.remove('active', 'fade-in');
                v.pause();
                v.currentTime = 0;
                v.style.opacity = '';
                v.style.transition = '';
            }
        });
    });
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

        // Hide all videos first
        allVideos.forEach(v => {
            v.classList.remove('active', 'fade-in');
            v.pause();
            v.currentTime = 0;
        });

        // Get sector videos
        const sectorVideos = await getSectorVideos(sector);

        // Update description text
        const allDescriptions = document.querySelectorAll('.description-text');
        allDescriptions.forEach(desc => desc.classList.remove('active'));
        const activeDescription = document.querySelector(`.description-text[data-sector="${sector}"]`);
        if (activeDescription) {
            activeDescription.classList.add('active');
        }

        // If no videos for this sector, just leave everything hidden
        if (sectorVideos.length === 0) return;

        // Warm up all videos in this sector if they haven't been played yet
        const warmUpPromises = sectorVideos.map(video => {
            return new Promise((resolve) => {
                // Skip if already warmed up (currentTime has been set before)
                if (video.dataset.warmedUp === 'true') {
                    resolve();
                    return;
                }

                if (video.readyState < 3) {
                    video.load();
                }

                const warmUpPlay = () => {
                    const originalTime = video.currentTime;
                    video.muted = true;
                    video.currentTime = 0;
                    video.play().catch(() => {});

                    setTimeout(() => {
                        video.pause();
                        video.currentTime = 0;
                        video.dataset.warmedUp = 'true';
                        resolve();
                    }, 100);
                };

                if (video.readyState >= 3) {
                    warmUpPlay();
                } else {
                    video.addEventListener('canplay', function onCanPlay() {
                        warmUpPlay();
                        video.removeEventListener('canplay', onCanPlay);
                    }, { once: true });
                }
            });
        });

        await Promise.all(warmUpPromises);

        // For default sector, start with random video; for others, start with first
        if (sector === 'default') {
            currentVideoIndex = Math.floor(Math.random() * sectorVideos.length);
            // Reset history and add the starting video
            recentVideoHistory = [currentVideoIndex];
        } else {
            currentVideoIndex = 0;
        }

        // Show and play selected video
        const newVideo = sectorVideos[currentVideoIndex];
        newVideo.currentTime = 0;

        // Function to show and play the video
        const showAndPlayVideo = () => {
            // Make video active but invisible first
            newVideo.classList.add('active');
            // Start playing while invisible to "warm up" decoding
            newVideo.play().catch(() => {});

            // Wait for a few frames to decode, then fade in
            setTimeout(() => {
                newVideo.classList.add('fade-in');
            }, 150); // 150ms delay = ~4-9 frames at 30-60fps
        };

        // Always wait for video to be ready with enough buffered data for consistent behavior
        if (newVideo.readyState >= 4) {
            showAndPlayVideo();
        } else {
            newVideo.load();
            newVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
                showAndPlayVideo();
                newVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            }, { once: true });
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
    lastScroll = currentScroll;
});

// Mobile menu toggle functionality
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
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
}

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

// Initialize: Start with random video and preload all default sector videos on page load
// Delay initialization to avoid interfering with CSS animations
setTimeout(async function initializeVideos() {
    const defaultVideos = await getSectorVideos('default');

    // Pick a random starting video
    if (defaultVideos.length > 0) {
        const randomStartIndex = Math.floor(Math.random() * defaultVideos.length);
        currentVideoIndex = randomStartIndex;
        recentVideoHistory = [randomStartIndex];

        // Hide all videos first
        allVideos.forEach(v => {
            v.classList.remove('active', 'fade-in');
            v.pause();
        });

        // Show the random starting video
        const startingVideo = defaultVideos[randomStartIndex];
        startingVideo.currentTime = 0;

        // Function to show and play the video with fade
        const showAndPlayVideo = () => {
            // Make video active but invisible first
            startingVideo.classList.add('active');
            // Start playing while invisible to "warm up" decoding
            startingVideo.play().catch(() => {});

            // Wait for a few frames to decode, then fade in
            setTimeout(() => {
                startingVideo.classList.add('fade-in');
            }, 150); // 150ms delay = ~4-9 frames at 30-60fps
        };

        // Wait for video to be ready before playing for consistent fade-in
        // Use readyState >= 4 (HAVE_ENOUGH_DATA) for smooth playback
        if (startingVideo.readyState >= 4) {
            // Video has enough data buffered
            showAndPlayVideo();
        } else {
            // Wait for video to have enough data to play smoothly
            startingVideo.load();
            startingVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
                showAndPlayVideo();
                startingVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            }, { once: true });
        }
    }

    // Preload and "warm up" all default videos by playing them briefly
    // This initializes the video decoder so first playback is smooth
    const warmUpPromises = defaultVideos.map(video => {
        return new Promise((resolve) => {
            // Skip the video that's currently playing
            if (video === defaultVideos[currentVideoIndex]) {
                video.dataset.warmedUp = 'true';
                resolve();
                return;
            }

            if (video.readyState < 3) {
                video.load();
            }

            // Play the video briefly to warm up the decoder
            video.muted = true; // Ensure it's muted
            video.currentTime = 0;

            const warmUpPlay = () => {
                video.play().catch(() => {});

                // Let it play for a few frames, then pause and reset
                setTimeout(() => {
                    video.pause();
                    video.currentTime = 0;
                    video.dataset.warmedUp = 'true'; // Mark as warmed up
                    resolve();
                }, 100); // Play for 100ms to decode a few frames
            };

            if (video.readyState >= 3) {
                warmUpPlay();
            } else {
                video.addEventListener('canplay', function onCanPlay() {
                    warmUpPlay();
                    video.removeEventListener('canplay', onCanPlay);
                }, { once: true });
            }
        });
    });

    // Wait for all videos to be warmed up before proceeding
    // This ensures smooth playback for all videos
    await Promise.all(warmUpPromises);
}, 1400); // Delay until after CSS animations complete (longest animation ends at ~1.3s)
