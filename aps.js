        // Load environment variables (add this at the top of your main file)


const firebaseConfig = {
      apiKey: "AIzaSyBMUi291fwb-HSxlGPQMxdEJGUTiOOvFBs",
      authDomain: "nexaverse-eeb07.firebaseapp.com",
      projectId: "nexaverse-eeb07",
      storageBucket: "nexaverse-eeb07.appspot.com",
      messagingSenderId: "686342300627",
      appId: "1:686342300627:web:90522d8f1129fb00b08526",
    }; // Your config



        
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();


        const authButton = document.getElementById('authButton');
        const userAvatar = document.getElementById('userAvatar');
        const userDropdown = document.getElementById('userDropdown');
        const authModal = document.getElementById('authModal');
        const closeModal = document.querySelector('.close-modal');
        const authTabs = document.querySelectorAll('.auth-tab');
        const authForms = document.querySelectorAll('.auth-form');
        const signInBtn = document.getElementById('signInBtn');
        const signUpBtn = document.getElementById('signUpBtn');
        const githubSignIn = document.getElementById('githubSignIn');
        const githubSignUp = document.getElementById('githubSignUp');
        const signOutBtn = document.getElementById('signOutBtn');
        
        const mainCta = document.getElementById('mainCta');
        const notificationBell = document.getElementById('notificationBell');
        const notificationBadge = document.getElementById('notificationBadge');
        const notificationPopup = document.getElementById('notificationPopup');
        const notificationList = document.getElementById('notificationList');
        const noNotificationsMessage = document.querySelector('.no-notifications');

        
        const adminAppsSection = document.getElementById('adminAppsSection');
        const createAppBtn = document.getElementById('createAppBtn');
        const appsGrid = document.getElementById('appsGrid');
        const appModal = document.getElementById('appModal');
        const appForm = document.getElementById('appForm');
        const isPaidCheckbox = document.getElementById('app-isPaid');
        const priceGroup = document.getElementById('priceGroup');
        const confirmModal = document.getElementById('confirmModal');
        let currentAppId = null;

    
        isPaidCheckbox.addEventListener('change', () => {
            priceGroup.style.display = isPaidCheckbox.checked ? 'block' : 'none';
        });
        
        function showModal() {
            authModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                authModal.classList.add('show');
            }, 10);
        }

        
        function hideModal() {
            authModal.classList.remove('show');
            setTimeout(() => {
                authModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 300);
        }

        
        function showAppModal() {
            appModal.style.display = 'flex';
            setTimeout(() => {
                appModal.classList.add('show');
            }, 10);
        }

        function hideAppModal() {
            appModal.classList.remove('show');
            setTimeout(() => {
                appModal.style.display = 'none';
            }, 300);
        }

        function showConfirmModal() {
            confirmModal.style.display = 'flex';
            setTimeout(() => {
                confirmModal.classList.add('show');
            }, 10);
        }

        function hideConfirmModal() {
            confirmModal.classList.remove('show');
            setTimeout(() => {
                confirmModal.style.display = 'none';
            }, 300);
        }

        
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation(); 
            notificationPopup.classList.toggle('show');
            const unreadItems = notificationList.querySelectorAll('.unread');
            unreadItems.forEach(item => item.classList.remove('unread'));
            notificationBadge.style.display = 'none'; 
        
        });

        
        window.addEventListener('click', (e) => {
            if (notificationPopup.classList.contains('show') && !notificationPopup.contains(e.target) && e.target !== notificationBell) {
                notificationPopup.classList.remove('show');
            }
        });

    
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
                        document.querySelector('.no-notifications').style.display = 'block';
                        notificationBadge.style.display = 'none';
                        return;
                    }
                    
                    document.querySelector('.no-notifications').style.display = 'none';
                    
                    let unreadCount = 0;
                    snapshot.forEach(doc => {
                        const notification = doc.data();
                        const item = document.createElement('li');
                        item.className = `notification-item ${!notification.read ? 'unread' : ''}`;
                        item.innerHTML = `
                            ${notification.message}
                            <small>${formatDate(notification.createdAt?.toDate())}</small>
                        `;
                        
                        // Mark as read when clicked
                        item.addEventListener('click', () => {
                            if (!notification.read) {
                                db.collection('notifications').doc(doc.id).update({
                                    read: true
                                });
                                item.classList.remove('unread');
                                unreadCount--;
                                notificationBadge.textContent = unreadCount > 0 ? unreadCount : '';
                                notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
                            }
                        });
                        
                        if (!notification.read) unreadCount++;
                        notificationList.appendChild(item);
                    });
                    
                    notificationBadge.textContent = unreadCount > 0 ? unreadCount : '';
                    notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
                });
        }

        function formatDate(date) {
            if (!date) return '';
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes} min ago`;
            if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
            return `${Math.floor(minutes / 1440)} days ago`;
        }

        // Auth State Listener
        auth.onAuthStateChanged(user => {
            if (user) {
                // User is signed in
                authButton.style.display = 'none';
                userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName ? user.displayName : user.email}&background=6A1B9A&color=FFFFFF&bold=true`;
                userAvatar.style.display = 'block';
                userAvatar.alt = user.displayName || user.email;

                // Check if user exists in Firestore
                checkUserInFirestore(user);
                loadNotifications();
                
                // Check if user is admin
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists && doc.data().role === 'admin') {
                        adminAppsSection.style.display = 'block';
                        loadApps();
                    } else {
                        adminAppsSection.style.display = 'none';
                    }
                });
            } else {
                // User is signed out
                authButton.style.display = 'block';
                userAvatar.style.display = 'none';
                userDropdown.classList.remove('show');
                adminAppsSection.style.display = 'none';
            }
        });

        // Check if user exists in Firestore or create new user
        function checkUserInFirestore(user) {
            const usersRef = db.collection('users').doc(user.uid);

            usersRef.get().then(doc => {
                if (!doc.exists) {
                    // User doesn't exist, create new user document
                    const username = user.displayName || user.email.split('@')[0];
                    const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${username}&background=6A1B9A&color=FFFFFF&bold=true`;

                    usersRef.set({
                        username: username,
                        email: user.email,
                        avatarUrl: avatarUrl,
                        role: 'user',
                        subscribers: 0,
                        following: 0,
                        likes: 0,
                        reputation: 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(error => {
                        console.error("Error adding user to Firestore:", error);
                    });
                } else {
                    // Update last login time
                    usersRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(error => {
                        console.error("Error updating user last login:", error);
                    });
                }
            }).catch(error => {
                console.error("Error getting user document:", error);
            });
        }

        // GitHub Auth Provider
        const githubProvider = new firebase.auth.GithubAuthProvider();
        githubProvider.addScope('user:email');

        // Load all apps
        function loadApps() {
            appsGrid.innerHTML = '';
            db.collection('apps').get().then(snapshot => {
                snapshot.forEach(doc => {
                    const app = doc.data();
                    createAppCard(doc.id, app);
                });
            });
        }

        // Create app card
        function createAppCard(id, app) {
            const card = document.createElement('div');
            card.className = 'app-card';
            card.style.backgroundImage = `url(${app.thumbnail})`;
            card.onclick = () => {
                if (!auth.currentUser || auth.currentUser.uid !== app.creator) {
                    window.location.href = `/app?id=${id}`;
                }
            };

            card.innerHTML = `
                <div class="app-logo">
                    <img src="https://i.ibb.co/Kxyq4qGh/Gemini-Generated-Image-uyuw4zuyuw4zuyuw-modified.png" alt="Probe App Logo">
                    <span>probe-app</span>
                </div>
                <div class="app-card-content">
                    <h3>${app.title}</h3>
                    <p>${app.description}</p>
                    <span class="price ${app.isPaid ? '' : 'free'}">${app.isPaid ? `$${app.price}` : 'FREE'}</span>
                </div>
            `;

            // Add admin actions if current user is admin
            if (auth.currentUser) {
                db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
                    if (doc.exists && doc.data().role === 'admin') {
                        const adminActions = document.createElement('div');
                        adminActions.className = 'admin-actions';
                        adminActions.innerHTML = `
                            <button class="delete-app" data-id="${id}"><i class="fas fa-trash"></i></button>
                        `;
                        card.appendChild(adminActions);

                        // Add delete event
                        adminActions.querySelector('.delete-app').addEventListener('click', (e) => {
                            e.stopPropagation();
                            currentAppId = id;
                            document.getElementById('confirmTitle').textContent = `Delete "${app.title}"?`;
                            document.getElementById('delete-reason').value = '';
                            showConfirmModal();
                        });
                    }
                });
            }

            appsGrid.appendChild(card);
        }

        // Event Listeners
        
        mainCta.addEventListener('click', () => {
            showModal();
            // Activate sign up tab
            authTabs.forEach(t => t.classList.remove('active'));
            document.querySelector('.auth-tab[data-tab="signup"]').classList.add('active');
            authForms.forEach(form => form.classList.remove('active'));
            document.getElementById('signUpForm').classList.add('active');
        });

        createAppBtn.addEventListener('click', () => {
            currentAppId = null;
            appForm.reset();
            priceGroup.style.display = 'none';
            showAppModal();
        });

        closeModal.addEventListener('click', hideModal);

        // Replace your current close modal event listeners with this:
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (authModal.classList.contains('show')) hideModal();
        if (appModal.classList.contains('show')) hideAppModal();
        if (confirmModal.classList.contains('show')) hideConfirmModal();
    });
});
        // Tab switching
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');

                // Update active tab
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding form
                authForms.forEach(form => {
                    form.classList.remove('active');
                    if (form.id === `${tabName}Form`) {
                        setTimeout(() => {
                            form.classList.add('active');
                        }, 10);
                    }
                });
            });
        });

        // Email/password sign in
        signInBtn.addEventListener('click', () => {
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;

            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }

            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    hideModal();
                })
                .catch(error => {
                    alert(error.message);
                    console.error("Sign in error:", error);
                });
        });

        // Email/password sign up
        signUpBtn.addEventListener('click', () => {
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            if (!username || !email || !password) {
                alert('Please fill in all fields');
                return;
            }

            if (password.length < 6) {
                alert('Password should be at least 6 characters');
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Update user profile with username
                    return userCredential.user.updateProfile({
                        displayName: username
                    }).then(() => {
                        // Add user to Firestore
                        return db.collection('users').doc(userCredential.user.uid).set({
                            username: username,
                            email: email,
                            avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=6A1B9A&color=FFFFFF&bold=true`,
                            role: 'user',
                            subscribers: 0,
                            following: 0,
                            likes: 0,
                            reputation: 0,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                })
                .then(() => {
                    hideModal();
                })
                .catch(error => {
                    alert(error.message);
                    console.error("Sign up error:", error);
                });
        });

        // GitHub sign in/up
        function signInWithGitHub() {
            auth.signInWithPopup(githubProvider)
                .then((result) => {
                    hideModal();
                })
                .catch(error => {
                    alert(error.message);
                    console.error("GitHub auth error:", error);
                });
        }

        githubSignIn.addEventListener('click', signInWithGitHub);
        githubSignUp.addEventListener('click', signInWithGitHub);

        // User avatar click
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        // Sign out
        signOutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                userDropdown.classList.remove('show');
            }).catch(error => {
                console.error("Sign out error:", error);
            });
        });

        // Close dropdown when clicking outside
        window.addEventListener('click', (e) => {
            if (userDropdown.classList.contains('show') && !userDropdown.contains(e.target) && e.target !== userAvatar) {
                userDropdown.classList.remove('show');
            }
        });

        // Prevent dropdown from closing when clicking inside it
        userDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Save app
        appForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('app-title').value;
            const description = document.getElementById('app-description').value;
            const thumbnail = document.getElementById('app-thumbnail').value;
            const download = document.getElementById('app-download').value;
            const isPaid = isPaidCheckbox.checked;
            const price = isPaid ? parseFloat(document.getElementById('app-price').value) : 0;
            const creator = document.getElementById('app-creator').value || null;

            if (isPaid && (isNaN(price) || price <= 0)) {
                alert('Please enter a valid price');
                return;
            }

            const appData = {
                title,
                description,
                thumbnail,
                download,
                isPaid,
                price,
                creator,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                ratings: [],
                averageRating: 0
            };

            if (currentAppId) {
                // Update existing app
                db.collection('apps').doc(currentAppId).update(appData)
                    .then(() => {
                        hideAppModal();
                        loadApps();
                    })
                    .catch(error => {
                        alert('Error updating app: ' + error.message);
                    });
            } else {
                // Create new app
                db.collection('apps').add(appData)
                    .then(() => {
                        hideAppModal();
                        loadApps();
                    })
                    .catch(error => {
                        alert('Error creating app: ' + error.message);
                    });
            }
        });

        // Delete app
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            const reason = document.getElementById('delete-reason').value;
            
            if (!reason) {
                alert('Please enter a reason for deletion');
                return;
            }

            // Get app data before deleting
            db.collection('apps').doc(currentAppId).get().then(doc => {
                const app = doc.data();
                
                // Delete the app
                db.collection('apps').doc(currentAppId).delete()
                    .then(() => {
                        // Create notification for creator if exists
                        if (app.creator) {
                            db.collection('notifications').add({
                                type: 'app_deleted',
                                message: `Your app "${app.title}" was deleted by admin. Reason: ${reason}`,
                                userId: app.creator,
                                read: false,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                        
                        // Create admin notification
                        db.collection('notifications').add({
                            type: 'admin_action',
                            message: `You deleted app "${app.title}"`,
                            userId: auth.currentUser.uid,
                            read: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });

                        hideConfirmModal();
                        loadApps();
                    })
                    .catch(error => {
                        alert('Error deleting app: ' + error.message);
                    });
            });
        });

        // Cancel delete
        document.getElementById('cancelDeleteBtn').addEventListener('click', hideConfirmModal);

        // Create more particles for the reveal animation
        function createParticles() {
            const reveal = document.querySelector('.tech-reveal');
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                particle.style.cssText = `
                    --tx: ${Math.random() * 100 - 50}px;
                    --ty: ${Math.random() * 60 - 30}px;
                    width: ${Math.random() * 6 + 4}px;
                    height: ${Math.random() * 6 + 4}px;
                    top: ${Math.random() * 80 + 10}%;
                    left: ${Math.random() * 80 + 10}%;
                    animation-delay: ${Math.random() * 2}s;
                `;
                reveal.appendChild(particle);
            }
        }

        // Initialize particles on load
        window.addEventListener('load', createParticles);
