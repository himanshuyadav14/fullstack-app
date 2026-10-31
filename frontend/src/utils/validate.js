const validate = {
  email: (email) => {
    if (!email.trim()) {
      return "Email is required";
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return "Invalid email";
    }
    return null;
  },
  password: (password) => {
    if (!password.trim()) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return null;
  },
  name: (name) => {
    if (!name.trim()) {
      return "Name is required";
    }
    return null;
  },
  confirmPassword: (confirmPassword, password) => {
    if (!confirmPassword.trim()) {
      return "Confirm Password is required";
    }
    if (confirmPassword !== password) {
      return "Passwords do not match";
    }
    return null;
  },
};

export default validate;
