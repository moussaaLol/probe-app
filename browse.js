    // Firebase Configuration
        const firebaseConfig = {
            apiKey: "AIzaSyBMUi291fwb-HSxlGPQMxdEJGUTiOOvFBs",
            authDomain: "nexaverse-eeb07.firebaseapp.com",
            projectId: "nexaverse-eeb07",
            storageBucket: "nexaverse-eeb07.appspot.com",
            messagingSenderId: "686342300627",
            appId: "1:686342300627:web:90522d8f1129fb00b08526",
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // DOM Elements
        const authButton = document.getElementById('authButton');
        const userAvatar = document.getElementById('userAvatar');
        const userDropdown = document.getElementById('userDropdown');
        const notificationBell = document.getElementById('notificationBell');
        const notificationBadge = document.getElementById('notificationBadge');
        const notificationPopup = document.getElementById('notificationPopup');
        const notificationList = document.getElementById('notificationList');
        const signOutBtn = document.getElementById('signOutBtn');
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const searchResults = document.getElementById('searchResults');
        const searchResultsList = document.getElementById('searchResultsList');

        // Carousel scrolling function
        function scrollCarousel(carouselId, scrollAmount) {
            const carousel = document.getElementById(carouselId);
            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }

        // Create app card element
        function createAppCard(app, id) {
            const card = document.createElement('div');
            card.className = 'app-card';
            card.onclick = () => {
                window.location.href = `/browse/app?id=${id}`;
            };

            // Determine rating icon
            const averageRating = app.averageRating || 0;
            const ratingIcon = averageRating >= 3.5 ? 
                `<i class="fas fa-arrow-up rating-icon rating-up"></i>` : 
                `<i class="fas fa-arrow-down rating-icon rating-down"></i>`;

            card.innerHTML = `
                <div class="app-card-bg" style="background-image: url('${app.thumbnail}')"></div>
                <div class="app-card-content">
                    <h3 class="app-card-title">${app.title}</h3>
                    <div class="app-card-rating">
                        ${ratingIcon}
                        <span>${averageRating.toFixed(1)}</span>
                    </div>
                    <span class="app-card-price ${app.isPaid ? '' : 'free-badge'}">
                        ${app.isPaid ? `$${app.price}` : 'FREE'}
                    </span>
                </div>
            `;

            return card;
        }

        // Load apps for a specific category
        async function loadCategoryApps(carouselId, queryFn) {
            const carousel = document.getElementById(carouselId);
            carousel.innerHTML = '<p>Loading apps...</p>';

            try {
                const snapshot = await queryFn(db.collection('apps')).get();
                carousel.innerHTML = '';

                if (snapshot.empty) {
                    carousel.innerHTML = '<p>No apps found</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    const app = doc.data();
                    const card = createAppCard(app, doc.id);
                    carousel.appendChild(card);
                });
            } catch (error) {
                console.error(`Error loading ${carouselId}:`, error);
                carousel.innerHTML = '<p>Error loading apps</p>';
            }
        }

        // Search apps function
        async function searchApps(searchTerm) {
            if (!searchTerm.trim()) {
                searchResults.classList.remove('show');
                return;
            }

            try {
                // Search in title first (case insensitive)
                const titleResults = await db.collection('apps')
                    .where('title', '>=', searchTerm)
                    .where('title', '<=', searchTerm + '\uf8ff')
                    .limit(5)
                    .get();

                // Search in description if not enough results from title
                const descriptionResults = await db.collection('apps')
                    .where('description', '>=', searchTerm)
                    .where('description', '<=', searchTerm + '\uf8ff')
                    .limit(5)
                    .get();

                // Combine results, prioritizing title matches
                const resultsMap = new Map();
                
                // Add title matches first
                titleResults.forEach(doc => {
                    resultsMap.set(doc.id, { ...doc.data(), id: doc.id, matchType: 'title' });
                });
                
                // Add description matches (won't override existing title matches)
                descriptionResults.forEach(doc => {
                    if (!resultsMap.has(doc.id)) {
                        resultsMap.set(doc.id, { ...doc.data(), id: doc.id, matchType: 'description' });
                    }
                });

                // Convert to array and sort (title matches first)
                const results = Array.from(resultsMap.values()).sort((a, b) => {
                    if (a.matchType === 'title' && b.matchType !== 'title') return -1;
                    if (a.matchType !== 'title' && b.matchType === 'title') return 1;
                    return 0;
                });

                // Display results
                searchResultsList.innerHTML = '';
                
                if (results.length === 0) {
                    searchResultsList.innerHTML = '<li class="search-result-item">No apps found</li>';
                } else {
                    results.forEach(app => {
                        const item = document.createElement('li');
                        item.className = 'search-result-item';
                        item.innerHTML = `
                            <div class="search-result-title">${app.title}</div>
                            <div class="search-result-desc">${app.description.substring(0, 100)}${app.description.length > 100 ? '...' : ''}</div>
                        `;
                        item.onclick = () => {
                            window.location.href = `/browse/app?id=${app.id}`;
                        };
                        searchResultsList.appendChild(item);
                    });
                }
                
                searchResults.classList.add('show');
            } catch (error) {
                console.error('Error searching apps:', error);
                searchResultsList.innerHTML = '<li class="search-result-item">Error searching apps</li>';
                searchResults.classList.add('show');
            }
        }

        // Load all categories
        function loadAllCategories() {
            // Top Rated (averageRating >= 4)
            loadCategoryApps('topRatedCarousel', (ref) => 
                ref.where('averageRating', '>=', 4)
                   .orderBy('averageRating', 'desc')
                   .limit(10)
            );

            // Free Apps
            loadCategoryApps('freeAppsCarousel', (ref) => 
                ref.where('isPaid', '==', false)
                   .orderBy('createdAt', 'desc')
                   .limit(10)
            );

            // Under $10
            loadCategoryApps('under10Carousel', (ref) => 
                ref.where('isPaid', '==', true)
                   .where('price', '<=', 10)
                   .orderBy('price', 'desc')
                   .limit(10)
            );

            // Premium ($10 - $50)
            loadCategoryApps('premiumCarousel', (ref) => 
                ref.where('isPaid', '==', true)
                   .where('price', '>', 10)
                   .where('price', '<=', 50)
                   .orderBy('price', 'desc')
                   .limit(10)
            );

            // New Releases (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            loadCategoryApps('newReleasesCarousel', (ref) => 
                ref.where('createdAt', '>=', thirtyDaysAgo)
                   .orderBy('createdAt', 'desc')
                   .limit(10)
            );

            // Most Downloaded
            loadCategoryApps('mostDownloadedCarousel', (ref) => 
                ref.orderBy('downloadCount', 'desc')
                   .limit(10)
            );
        }

        // Load notifications
        function loadNotifications() {
            if (!auth.currentUser) return;

            db.collection('notifications')
                .where('userId', '==', auth.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get()
                .then(snapshot => {
                    notificationList.innerHTML = '';
                    
                    if (snapshot.empty) {
                        notificationList.innerHTML = '<li class="notification-item">No notifications</li>';
                        notificationBadge.style.display = 'none';
                        return;
                    }

                    let unreadCount = 0;
                    snapshot.forEach(doc => {
                        const notification = doc.data();
                        const item = document.createElement('li');
                        item.className = `notification-item ${!notification.read ? 'unread' : ''}`;
                        item.innerHTML = `
                            ${notification.message}
                            <small>${new Date(notification.createdAt?.toDate()).toLocaleString()}</small>
                        `;

                        if (!notification.read) unreadCount++;
                        notificationList.appendChild(item);
                    });

                    notificationBadge.textContent = unreadCount > 0 ? unreadCount : '';
                    notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
                });
        }

        // Auth state listener
        auth.onAuthStateChanged(user => {
            if (user) {
                authButton.style.display = 'none';
                userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=6A1B9A&color=FFFFFF&bold=true`;
                userAvatar.style.display = 'block';
                loadNotifications();
            } else {
                authButton.style.display = 'block';
                userAvatar.style.display = 'none';
                notificationBadge.style.display = 'none';
            }
            
            // Load apps regardless of auth state
            loadAllCategories();
        });

        // Event listeners
        notificationBell.addEventListener('click', () => {
            notificationPopup.classList.toggle('show');
        });

        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        signOutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                userDropdown.classList.remove('show');
            });
        });

        // Search functionality
        searchButton.addEventListener('click', () => {
            searchApps(searchInput.value.trim());
        });

        searchInput.addEventListener('input', () => {
            searchApps(searchInput.value.trim());
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchApps(searchInput.value.trim());
            }
        });

        // Close dropdowns when clicking outside
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-bell') && !e.target.closest('.notification-popup')) {
                notificationPopup.classList.remove('show');
            }
            
            if (!e.target.closest('.user-avatar') && !e.target.closest('.user-dropdown')) {
                userDropdown.classList.remove('show');
            }
            
            if (!e.target.closest('.search-container')) {
                searchResults.classList.remove('show');
            }
        });

        // Initialize carousel navigation
        document.querySelectorAll('.carousel-nav').forEach(nav => {
            nav.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
