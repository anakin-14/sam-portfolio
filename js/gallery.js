/**
 * ============================================================
 * GALLERY MODULE
 * ============================================================
 * Handles gallery rendering, filtering, search, and overlay.
 * Works with designs.js data file.
 */

(function() {
    'use strict';

    // ============================================================
    // State
    // ============================================================
    let currentFilter = 'all';
    let searchQuery = '';
    let currentIndex = 0;
    let filteredDesigns = [];
    let isShuffled = false;

    // ============================================================
    // Layout Pattern
    // ============================================================
    // Cycle through these layout types for visual rhythm
    const LAYOUT_PATTERN = ['large', 'wide', 'square', 'tall', 'square'];
    let layoutIndex = 0;

    function getNextLayout(isFeatured) {
        // Featured items always get 'large' layout
        if (isFeatured) return 'large';
        
        const layout = LAYOUT_PATTERN[layoutIndex % LAYOUT_PATTERN.length];
        layoutIndex++;
        return layout;
    }

    // ============================================================
    // Get Unique Categories
    // ============================================================
    function getCategories() {
        const categories = new Set();
        designs.forEach(d => categories.add(d.category));
        return Array.from(categories).sort();
    }

    // ============================================================
    // Render Filter Buttons with Count Badges
    // ============================================================
    function renderFilterButtons() {
        const container = document.getElementById('filter-buttons');
        const categories = getCategories();
        
        // Count designs per category
        const categoryCounts = {};
        designs.forEach(d => {
            categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
        });
        
        // Clear existing (keep "All" button)
        container.innerHTML = `<button class="filter-btn active" data-filter="all">All <span class="count">${designs.length}</span></button>`;
        
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.filter = cat;
            btn.innerHTML = `${cat} <span class="count">${categoryCounts[cat]}</span>`;
            container.appendChild(btn);
        });

        // Add click handlers
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderGallery();
            });
        });
    }

    // ============================================================
    // Filter Designs
    // ============================================================
    function filterDesigns() {
        let result = [...designs];

        // Filter by category
        if (currentFilter !== 'all') {
            result = result.filter(d => d.category === currentFilter);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(d => 
                d.title.toLowerCase().includes(query) ||
                d.description.toLowerCase().includes(query) ||
                d.category.toLowerCase().includes(query)
            );
        }

        // Apply shuffle if active
        if (isShuffled) {
            result = shuffleArray(result);
        }

        return result;
    }

    // ============================================================
    // Shuffle Array (Fisher-Yates)
    // ============================================================
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ============================================================
    // Toggle Shuffle
    // ============================================================
    function toggleShuffle() {
        isShuffled = !isShuffled;
        renderGallery();
    }

    // ============================================================
    // Render Gallery
    // ============================================================
    function renderGallery() {
        const gallery = document.getElementById('gallery');
        const emptyState = document.getElementById('empty-state');
        
        filteredDesigns = filterDesigns();
        
        // Update work count
        const countEl = document.getElementById('work-count');
        if (countEl) {
            countEl.textContent = `${filteredDesigns.length} Work${filteredDesigns.length !== 1 ? 's' : ''}`;
        }

        // Show empty state if no results
        if (filteredDesigns.length === 0) {
            gallery.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        // Reset layout index for each render
        layoutIndex = 0;
        
        // Build gallery HTML
        let html = '';
        filteredDesigns.forEach((design, index) => {
            const layout = getNextLayout(design.featured);
            html += `
                <article class="gallery-item ${layout}" data-index="${index}">
                    <div class="gallery-item-inner">
                        <img 
                            src="${design.image}" 
                            alt="${design.alt || design.title}"
                            loading="lazy"
                            onload="this.classList.remove('loading')"
                            onerror="this.classList.remove('loading')"
                        >
                        <div class="gallery-item-caption">
                            <h3 class="gallery-item-title">${design.title}</h3>
                            <p class="gallery-item-meta">${design.category} — ${design.year}</p>
                        </div>
                    </div>
                </article>
            `;
        });

        gallery.innerHTML = html;

        // Add click handlers to items
        gallery.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                openOverlay(index);
            });
        });

        // Trigger scroll animations
        observeGalleryItems();
    }

    // ============================================================
    // Intersection Observer for Scroll Animations
    // ============================================================
    function observeGalleryItems() {
        const items = document.querySelectorAll('.gallery-item');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        items.forEach((item, i) => {
            // Stagger the animation
            item.style.transitionDelay = `${(i % 5) * 0.1}s`;
            observer.observe(item);
        });

        // Observe hire section
        const hireSection = document.querySelector('.hire-section');
        if (hireSection) {
            const hireObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        hireObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            hireObserver.observe(hireSection);
        }
    }

    // ============================================================
    // Overlay Functions
    // ============================================================
    function openOverlay(index) {
        currentIndex = index;
        const design = filteredDesigns[index];
        
        if (!design) return;

        // Update overlay content
        document.getElementById('overlay-image').src = design.image;
        document.getElementById('overlay-image').alt = design.alt || design.title;
        document.getElementById('overlay-category').textContent = design.category;
        document.getElementById('overlay-title').textContent = design.title;
        document.getElementById('overlay-year').textContent = design.year;
        document.getElementById('overlay-description').textContent = design.description;

        // Show overlay
        document.getElementById('overlay').classList.add('open');
        document.body.style.overflow = 'hidden';

        // Preload adjacent images
        preloadAdjacent(index);
    }

    function closeOverlay() {
        document.getElementById('overlay').classList.remove('open');
        document.body.style.overflow = '';
    }

    function navigateOverlay(direction) {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < filteredDesigns.length) {
            openOverlay(newIndex);
        }
    }

    function preloadAdjacent(index) {
        [index - 1, index + 1].forEach(i => {
            if (i >= 0 && i < filteredDesigns.length) {
                const img = new Image();
                img.src = filteredDesigns[i].image;
            }
        });
    }

    // ============================================================
    // Search Handler
    // ============================================================
    function initSearch() {
        const input = document.getElementById('search-input');
        let debounceTimer;

        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchQuery = e.target.value;
                renderGallery();
            }, 200);
        });
    }

    // ============================================================
    // Keyboard Navigation
    // ============================================================
    function initKeyboard() {
        document.addEventListener('keydown', (e) => {
            const overlay = document.getElementById('overlay');
            
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                closeOverlay();
            }
            
            if (overlay.classList.contains('open')) {
                if (e.key === 'ArrowLeft') {
                    navigateOverlay(-1);
                } else if (e.key === 'ArrowRight') {
                    navigateOverlay(1);
                }
            }
        });
    }

    // ============================================================
    // Overlay Event Listeners
    // ============================================================
    function initOverlay() {
        const overlay = document.getElementById('overlay');
        
        // Close button
        document.getElementById('overlay-close').addEventListener('click', closeOverlay);
        
        // Navigation buttons
        document.getElementById('overlay-prev').addEventListener('click', () => navigateOverlay(-1));
        document.getElementById('overlay-next').addEventListener('click', () => navigateOverlay(1));
        
        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeOverlay();
            }
        });
    }

    // ============================================================
    // Shuffle Button Handler
    // ============================================================
    function initShuffleButton() {
        const shuffleBtn = document.getElementById('shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                toggleShuffle();
                shuffleBtn.classList.toggle('active', isShuffled);
            });
        }
    }

    // ============================================================
    // Share Button Handler
    // ============================================================
    function initShareButton() {
        const shareBtn = document.getElementById('share-btn');
        const shareMenu = document.getElementById('share-menu');
        
        if (shareBtn && shareMenu) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                shareMenu.classList.toggle('open');
            });
            
            // Copy link
            const copyLink = document.getElementById('copy-link');
            if (copyLink) {
                copyLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const title = document.getElementById('overlay-title')?.textContent || 'this design';
                    const text = `Check out "${title}" on Shibui Archive ✦ @shibuiarchive`;
                    navigator.clipboard.writeText(text).then(() => {
                        copyLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
                        setTimeout(() => {
                            copyLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Link`;
                        }, 2000);
                    });
                });
            }
            
            // Native share (if supported)
            const shareNative = document.getElementById('share-native');
            if (shareNative) {
                shareNative.addEventListener('click', () => {
                    if (navigator.share) {
                        navigator.share({
                            title: 'Shibui Archive',
                            text: 'Check out this design archive',
                            url: window.location.href
                        });
                    }
                });
            }
            
            // Close on outside click
            document.addEventListener('click', () => {
                shareMenu.classList.remove('open');
            });
        }
    }

    // ============================================================
    // Back to Top Button
    // ============================================================
    function initBackToTop() {
        const backToTop = document.getElementById('back-to-top');
        
        if (backToTop) {
            // Show/hide on scroll
            window.addEventListener('scroll', () => {
                if (window.scrollY > 500) {
                    backToTop.classList.add('visible');
                } else {
                    backToTop.classList.remove('visible');
                }
            });
            
            // Scroll to top on click
            backToTop.addEventListener('click', () => {
                window.lenis ? window.lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    // ============================================================
    // About Section Observer
    // ============================================================
    function initAboutSection() {
        const aboutSection = document.querySelector('.about-section');
        
        if (aboutSection) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });
            
            observer.observe(aboutSection);
        }
    }

    // ============================================================
    // Custom Cursor
    // ============================================================
    function initCustomCursor() {
        const cursor = document.getElementById('custom-cursor');
        
        if (!cursor || 'ontouchstart' in window) return; // No cursor on touch devices
        
        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        // Animate cursor
        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.15;
            cursorY += (mouseY - cursorY) * 0.15;
            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';
            requestAnimationFrame(animateCursor);
        }
        animateCursor();
        
        // Hover states
        const hoverElements = 'a, button, .gallery-item, .filter-btn, .share-btn';
        document.querySelectorAll(hoverElements).forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
        
        // Click effect
        document.addEventListener('mousedown', () => cursor.classList.add('click'));
        document.addEventListener('mouseup', () => cursor.classList.remove('click'));
        
        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
        document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
    }

    // ============================================================
    // Lightbox Zoom
    // ============================================================
    function initLightboxZoom() {
        const imageWrapper = document.querySelector('.overlay-image-wrapper');
        const overlayImage = document.getElementById('overlay-image');
        
        if (!imageWrapper || !overlayImage) return;
        
        let isZoomed = false;
        let scale = 1;
        let panX = 0;
        let panY = 0;
        let startX, startY;
        let isDragging = false;
        
        imageWrapper.addEventListener('click', (e) => {
            if (isDragging) return;
            
            isZoomed = !isZoomed;
            imageWrapper.classList.toggle('zoomed', isZoomed);
            
            if (isZoomed) {
                scale = 2;
                // Center the zoom
                const rect = imageWrapper.getBoundingClientRect();
                panX = (rect.width / 2 - e.clientX) * (scale - 1);
                panY = (rect.height / 2 - e.clientY) * (scale - 1);
            } else {
                scale = 1;
                panX = 0;
                panY = 0;
            }
            
            updateTransform();
        });
        
        // Pan when zoomed
        imageWrapper.addEventListener('mousedown', (e) => {
            if (!isZoomed) return;
            isDragging = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
            imageWrapper.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !isZoomed) return;
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateTransform();
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            if (imageWrapper) {
                imageWrapper.style.cursor = 'grab';
            }
        });
        
        function updateTransform() {
            overlayImage.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
        
        // Reset zoom when closing overlay
        const originalCloseOverlay = closeOverlay;
        closeOverlay = function() {
            isZoomed = false;
            scale = 1;
            panX = 0;
            panY = 0;
            imageWrapper.classList.remove('zoomed');
            overlayImage.style.transform = '';
            originalCloseOverlay();
        };
    }

    // ============================================================
    // Initialize Gallery
    // ============================================================
    function init() {
        renderFilterButtons();
        renderGallery();
        initSearch();
        initKeyboard();
        initOverlay();
        initShuffleButton();
        initShareButton();
        initBackToTop();
        initAboutSection();
        initCustomCursor();
        initLightboxZoom();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();