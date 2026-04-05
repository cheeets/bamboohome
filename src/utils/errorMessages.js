/**
 * Converts Firebase error codes to user-friendly messages
 * @param {Error} error - The Firebase error object
 * @returns {string} - User-friendly error message
 */
export function getFriendlyErrorMessage(error) {
  let errorCode = error.code || ''

  // If no code, try to extract from error message (Firebase format: "Firebase: Error (auth/code)")
  if (!errorCode && error.message) {
    const codeMatch = error.message.match(/\(auth\/([^)]+)\)/)
    if (codeMatch) {
      errorCode = `auth/${codeMatch[1]}`
    }
  }

  const errorMessages = {
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/email-already-in-use': 'This email is already registered. Please log in or use a different email.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/too-many-requests': 'Too many login attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
    'auth/invalid-password': 'Password is invalid. Please try another password.',
    'auth/account-exists-with-different-credential':
      'An account already exists with a different login method.',
    'auth/credential-already-in-use': 'This credential is already linked to another account.',
    'auth/requires-recent-login': 'Please log out and log back in to perform this action.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/internal-error': 'An internal error occurred. Please try again later.',
  }

  return errorMessages[errorCode] || error.message || 'An error occurred. Please try again.'
}
