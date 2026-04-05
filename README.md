# GreenNest - Eco-Friendly Ordering System

A modern web application where students can browse products, add them to a cart, and place orders. Features role-based access for students, sellers, and admins.

## Tech Stack

- **Frontend**: React.js 18 with Vite
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Routing**: React Router v6
- **State Management**: Context API (AuthContext, CartContext)
- **Styling**: Plain CSS (no external UI libraries)

## Project Structure

```
src/
├── components/
│   ├── Header.jsx          # Navigation header with auth info
│   ├── ProductCard.jsx     # Reusable product display component
│   └── ProtectedRoute.jsx  # Route protection wrapper
├── pages/
│   ├── LoginPage.jsx       # User login
│   ├── SignupPage.jsx      # User registration
│   ├── LandingPage.jsx     # Landing page with hero section
│   └── HomePage.jsx        # Product listing
├── context/
│   ├── AuthContext.jsx     # Authentication state & methods
│   └── CartContext.jsx     # Shopping cart state & methods
├── services/
│   └── firebase.js         # Firebase configuration
├── css/
│   ├── index.css          # Global styles
│   ├── Header.css
│   ├── Auth.css
│   ├── ProductCard.css
│   ├── HomePage.css
│   └── App.css
├── App.jsx                # Main app component with routing
└── main.jsx              # Entry point
```

## Prerequisites

- Node.js 16+ and npm
- Firebase project (with Authentication and Firestore enabled)
