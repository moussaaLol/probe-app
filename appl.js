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

// Stripe Configuration
const stripe = Stripe('pk_test_51S9TzxQ08peRv6NQE5mL8DCVbxc2k4fs7MI3n0jEBO9n3vwqFEFBYLuw7PJFaM93tldlrdoM5j1JHbCi5DliIFCS00mIdukMoc'); // Replace with your Stripe publishable key

// DOM Elements

const authButton = document.getElementById('authButton');
const userAvatar = document.getElementById('userAvatar');
const userDropdown = document.getElementById('userDropdown');
const notificationBell = document.getElementById('notificationBell');
const notificationBadge = document.getElementById('notificationBadge');
const notificationPopup = document.getElementById('notificationPopup');
const notificationList = document.getElementById('notificationList');
const signOutBtn = document.getElementById('signOutBtn');

// App Details Elements
const appThumbnail = document.getElementById('appThumbnail');
const appTitle = document.getElementById('appTitle');
const appPublisher = document.getElementById('appPublisher');
const ratingStars = document.getElementById('ratingStars');
const ratingCount = document.getElementById('ratingCount');
const appPrice = document.getElementById('appPrice');
const appDescription = document.getElementById('appDescription');
const downloadBtn = document.getElementById('downloadBtn');
const ratingForm = document.getElementById('ratingForm');
const submitRatingBtn = document.getElementById('submitRatingBtn');
const reviewsList = document.getElementById('reviewsList');

// Confirmation Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmModalOverlay = document.getElementById('confirmModalOverlay');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// Get app ID from URL
const urlParams = new URLSearchParams(window.location.search);
const appId = urlParams.get('id');
let currentApp = null;

// Load app details
function loadAppDetails() {
    if (!appId) {
        window.location.href = '/browse';
        return;
    }

    db.collection('apps').doc(appId).get().then(doc => {
        if (!doc.exists) {
            window.location.href = '/browse';
            return;
        }

        currentApp = doc.data();
        currentApp.id = doc.id;
        
        // Set app details
        appThumbnail.src = currentApp.thumbnail;
        appTitle.textContent = currentApp.title;
        appPublisher.textContent = currentApp.publisher || 'Unknown Publisher';
        appDescription.textContent = currentApp.Mdesc || currentApp.description || 'No description available.';
        
        // Set price and download button
        if (currentApp.isPaid) {
            appPrice.textContent = `$${currentApp.price}`;
            appPrice.classList.remove('free-badge');
            downloadBtn.textContent = 'Buy Now';
            downloadBtn.onclick = handlePurchase;
        } else {
            appPrice.textContent = 'FREE';
            appPrice.classList.add('free-badge');
            downloadBtn.textContent = 'Download';
            downloadBtn.onclick = () => {
                window.location.href = currentApp.downloadUrl || '#';
            };
        }

        // Load ratings
        updateRatingDisplay(currentApp.averageRating || 0, currentApp.ratingCount || 0);
        
        // Load reviews
        loadReviews();
    }).catch(error => {
        console.error('Error loading app:', error);
        window.location.href = '/browse';
    });
}


// Handle purchase flow
function handlePurchase() {
    console.log('Purchase button clicked');
    if (!auth.currentUser) {
        alert('Please sign in to purchase this app.');
        return;
    }
    
    // Check if Stripe is available
    if (!stripe) {
        alert('Payment system is currently unavailable. Please try again later.');
        return;
    }
    
    // Show confirmation modal
    if (userEmailDisplay && purchaseAmount) {
        userEmailDisplay.textContent = auth.currentUser.email;
        purchaseAmount.textContent = `$${currentApp.price}`;
        showModal(confirmModalOverlay);
        console.log('Modal should be visible now');
    } else {
        console.error('Modal elements not found');
        // Fallback: proceed directly to checkout
        createStripeCheckout();
    }
}

// Handle purchase confirmation
function confirmPurchase() {
    console.log('Purchase confirmed');
    hideModal(confirmModalOverlay);
    createStripeCheckout();
}

// Create Stripe checkout session
// Create Stripe checkout session
async function createStripeCheckout() {
  try {
    // Show loading state
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    downloadBtn.disabled = true;
    
    // Create checkout session using Vercel API route
    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: currentApp.id,
        appName: currentApp.title,
        price: currentApp.price * 100, // Convert to cents
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server error: ' + response.status);
    }

    const session = await response.json();

    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({
      sessionId: session.id,
    });

    if (result.error) {
      alert(result.error.message);
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    alert(error.message || 'Failed to initiate payment. Please try again.');
  } finally {
    // Reset button state
    if (currentApp.isPaid) {
      downloadBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Buy Now';
    } else {
      downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    }
    downloadBtn.disabled = false;
  }
}

// Verify payment and assign premium role
async function verifyPaymentAndAssignRole() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  
  if (sessionId) {
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Server error: ' + response.status);
      }

      const result = await response.json();

      if (result.success) {
        // Assign premium role to user
        await db.collection('users').doc(auth.currentUser.uid).set({
          premium: true,
          premiumSince: new Date(),
          purchasedApps: firebase.firestore.FieldValue.arrayUnion(currentApp.id)
        }, { merge: true });

        // Show success message
        alert('Payment successful! Premium features have been activated.');
      } else {
        alert('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Error verifying payment. Please contact support.');
    }
  }
}

// Modal functions
function showModal(modal) {
    if (modal) {
        console.log('Showing modal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        // Force reflow to ensure the display change is processed
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    } else {
        console.error('Modal element not provided to showModal');
    }
}

function hideModal(modal) {
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// Update rating display
function updateRatingDisplay(averageRating, ratingCount) {
    ratingStars.innerHTML = '';
    ratingCount.textContent = `(${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'})`;
    
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating % 1 >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        ratingStars.innerHTML += '<i class="fas fa-star"></i>';
    }
    
    // Add half star if needed
    if (hasHalfStar) {
        ratingStars.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Add empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        ratingStars.innerHTML += '<i class="far fa-star"></i>';
    }
}

// Load reviews
function loadReviews() {
    db.collection('apps').doc(appId).collection('reviews')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            reviewsList.innerHTML = '';
            
            if (snapshot.empty) {
                reviewsList.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to review!</div>';
                return;
            }

            snapshot.forEach(doc => {
                const review = doc.data();
                const reviewItem = document.createElement('div');
                reviewItem.className = 'review-item';
                
                const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                
                reviewItem.innerHTML = `
                    <div class="review-header">
                        <span class="review-user">${review.userName || 'Anonymous'}</span>
                        <span class="review-date">${new Date(review.createdAt?.toDate()).toLocaleDateString()}</span>
                    </div>
                    <div class="review-stars">${stars}</div>
                    <div class="review-content">${review.comment || 'No comment provided.'}</div>
                `;
                
                reviewsList.appendChild(reviewItem);
            });
        }).catch(error => {
            console.error('Error loading reviews:', error);
            reviewsList.innerHTML = '<div class="no-reviews">Error loading reviews</div>';
        });
}

// Submit rating
function submitRating() {
    if (!auth.currentUser) {
        alert('Please sign in to rate this app.');
        return;
    }

    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    const comment = document.getElementById('ratingComment').value.trim();
    
    if (!rating) {
        alert('Please select a rating.');
        return;
    }

    const userName = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
    const userId = auth.currentUser.uid;
    
    // Add review to subcollection
    db.collection('apps').doc(appId).collection('reviews').add({
        userId: userId,
        userName: userName,
        rating: parseInt(rating),
        comment: comment,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // Update app rating stats
        updateAppRatingStats(parseInt(rating));
        
        // Clear form
        document.getElementById('ratingComment').value = '';
        document.querySelectorAll('.star-input').forEach(input => {
            input.checked = false;
        });
        
        // Reload reviews
        loadReviews();
    }).catch(error => {
        console.error('Error submitting review:', error);
        alert('Failed to submit review. Please try again.');
    });
}

// Update app rating stats
function updateAppRatingStats(newRating) {
    const appRef = db.collection('apps').doc(appId);
    
    db.runTransaction(transaction => {
        return transaction.get(appRef).then(doc => {
            if (!doc.exists) {
                throw "Document does not exist!";
            }
            
            const data = doc.data();
            const currentRating = data.averageRating || 0;
            const currentCount = data.ratingCount || 0;
            
            // Calculate new average
            const newAverage = ((currentRating * currentCount) + newRating) / (currentCount + 1);
            
            // Update transaction
            transaction.update(appRef, {
                averageRating: newAverage,
                ratingCount: currentCount + 1
            });
        });
    }).then(() => {
        // Refresh rating display
        db.collection('apps').doc(appId).get().then(doc => {
            const app = doc.data();
            updateRatingDisplay(app.averageRating || 0, app.ratingCount || 0);
        });
    }).catch(error => {
        console.error("Transaction failed: ", error);
        alert("Failed to update rating. Please try again.");
    });
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
        
        // Check if we're on the success page
        if (window.location.pathname.includes('/checkout/success')) {
            verifyPaymentAndAssignRole();
        }
    } else {
        authButton.style.display = 'block';
        userAvatar.style.display = 'none';
        notificationBadge.style.display = 'none';
    }
    
    // Load app details regardless of auth state
    loadAppDetails();
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

submitRatingBtn.addEventListener('click', submitRating);

// Confirmation modal events
confirmYesBtn.addEventListener('click', confirmPurchase);
confirmNoBtn.addEventListener('click', () => hideModal(confirmModalOverlay));

// Close dropdowns when clicking outside
window.addEventListener('click', (e) => {
    if (!e.target.closest('.notification-bell') && !e.target.closest('.notification-popup')) {
        notificationPopup.classList.remove('show');
    }
    
    if (!e.target.closest('.user-avatar') && !e.target.closest('.user-dropdown')) {
        userDropdown.classList.remove('show');
    }
    
    if (e.target === confirmModalOverlay) {
        hideModal(confirmModalOverlay);
    }
});

// Hide rating form if not authenticated
auth.onAuthStateChanged(user => {
    if (!user) {
        ratingForm.style.display = 'none';
    } else {
        ratingForm.style.display = 'block';
    }
});
