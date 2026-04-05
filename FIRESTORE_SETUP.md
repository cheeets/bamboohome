# Firestore Setup Guide

## Firebase Permission Errors

If you're seeing these errors:
- `FirebaseError: Missing or insufficient permissions`
- `FirebaseError: Failed to get document because the client is offline`

This is because the default Firestore security rules deny all read/write operations.

## How to Set Up Firestore Security Rules

### Step 1: Open Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in the left sidebar

### Step 2: Navigate to Rules
1. Click on the **Rules** tab at the top
2. You should see the default rules that deny everything

### Step 3: Copy and Paste New Rules

Replace all the existing code with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read products
    match /products/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid != null;
    }
    
    // Users collection - authenticated users only
    match /users/{uid} {
      // Allow users to read and write their own document
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid;
      
      // Allow creation of new user documents
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
    }
    
    // Orders collection
    match /orders/{document=**} {
      allow read: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.uid == resource.data.sellerId);
      allow create: if request.auth != null;
      allow update: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.uid == resource.data.sellerId);
    }
    
    // Default deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 4: Publish Rules
1. Click the **Publish** button
2. Confirm when prompted
3. Wait for the rules to deploy (usually takes a few seconds)

## What These Rules Do

### Products Collection
- ✅ **Anyone** can read products (no login needed to browse)
- ✅ **Authenticated users** can create/update products

### Users Collection
- ✅ Users can **only read/write their own document** (uid must match)
- ✅ **New users can be created** during registration

### Orders Collection
- ✅ Users can **read only their own orders**
- ✅ Sellers can **read orders for their products**
- ✅ Authenticated users can **create new orders**

### Other Collections
- ❌ All other collections are **denied** by default

## Testing the Setup

After applying the rules:

1. **Register a new user** - Should work (creates user document)
2. **Login** - Should work (reads user document)
3. **Browse products** - Should work (reads products publicly)
4. **Add to cart** - Should work (stored in localStorage)
5. **Create order** - Should work (creates order document)

## Troubleshooting

If you still see permission errors:

1. **Clear browser cache** - Press `Ctrl+Shift+Delete` and clear data
2. **Check Firebase Auth is enabled** - Go to Authentication tab and enable Email/Password
3. **Verify Firestore is created** - Should see collections in Firestore Database tab
4. **Wait a moment** - Rules sometimes take 30 seconds to fully deploy
5. **Refresh the page** - Sometimes the auth state needs to be reloaded

## Production Security Note

⚠️ **These rules are for development only!** 

For production, you should:
- Add admin verification for admin-only operations
- Validate data more strictly
- Implement rate limiting
- Add audit logging
- Review security rules regularly

See the main README.md for more information.
