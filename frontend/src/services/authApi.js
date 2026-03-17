import { apiClient } from '../lib/apiClient';

export const authApi = {
  // Get current user profile
  getProfile: () => apiClient.get('/auth/profile'),

  // Update profile
  updateProfile: (data) => apiClient.patch('/auth/profile', data),

  // Upload profile image
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post('/auth/profile/upload-image', formData, {
      headers: { 'Content-Type': undefined }, // Delete default so browser sets multipart
    });
  },

  // Delete profile image
  deleteProfileImage: () => apiClient.delete('/auth/profile/image'),

  // Forgot password
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),

  // Verify OTP
  verifyOtp: (email, otp) => apiClient.post('/auth/verify-otp', { email, otp }),

  // Reset password with token
  resetPassword: (token, newPassword) => apiClient.post('/auth/reset-password', { token, newPassword }),
};
