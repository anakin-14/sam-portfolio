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
    // Render Filter Buttons
    // ============================================================
    function renderFilterButtons() {
        const container = document.getElementById('filter-buttons');
        const categories = getCategories();
        
        // Clear existing (keep "All" button)
        container.innerHTML = '<button class="filter-btn active" data-filter="all">All</button>';
        
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.filter = cat;
            btn.textContent = cat;
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

        return result;
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
    // Initialize Gallery
    // ============================================================
    function init() {
        renderFilterButtons();
        renderGallery();
        initSearch();
        initKeyboard();
        initOverlay();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();