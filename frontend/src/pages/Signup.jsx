import { useState } from "react";
import { Link } from "react-router-dom";
import validate from "../utils/validate";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isVisiblePassword, setIsVisiblePassword] = useState(false);
  const [isVisibleConfirmPassword, setIsVisibleConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const nameError = validate.name(formData.name);
    const emailError = validate.email(formData.email);
    const passwordError = validate.password(formData.password);
    const confirmPasswordError = validate.confirmPassword(
      formData.confirmPassword,
      formData.password,
    );

    setErrors({
      name: nameError || "",
      email: emailError || "",
      password: passwordError || "",
      confirmPassword: confirmPasswordError || "",
    });

    if (nameError || emailError || passwordError || confirmPasswordError) {
      return;
    }

    console.log("Signup successful");

    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setIsVisiblePassword(false);
    setIsVisibleConfirmPassword(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        backgroundColor: "black",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          boxSizing: "border-box",
          padding: "32px",
          border: "1px solid #333",
          borderRadius: "12px",
          backgroundColor: "#181818",
        }}
      >
        <form
          noValidate
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              setErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="Name"
            style={{
              width: "300px",
              height: "40px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              padding: "0 10px",
            }}
          />
          {errors.name && (
            <p style={{ color: "red", margin: 0, padding: 0 }}>{errors.name}</p>
          )}

          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, email: e.target.value }));
              setErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="Email"
            style={{
              width: "300px",
              height: "40px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              padding: "0 10px",
            }}
          />
          {errors.email && (
            <p style={{ color: "red", margin: 0, padding: 0 }}>
              {errors.email}
            </p>
          )}
          <div style={{ position: "relative" }}>
            <input
              type={isVisiblePassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={(e) => {
                const newPassword = e.target.value;
                setFormData((prev) => ({ ...prev, password: newPassword }));
                setErrors((prev) => ({
                  ...prev,
                  password: "",
                  confirmPassword: formData.confirmPassword
                    ? validate.confirmPassword(
                        formData.confirmPassword,
                        newPassword,
                      ) || ""
                    : "",
                }));
              }}
              placeholder="Password"
              style={{
                width: "300px",
                height: "40px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                padding: "0 10px",
              }}
            />
            <button
              style={{
                position: "absolute",
                cursor: "pointer",
                right: 10,
                top: 10,
              }}
              type="button"
              onClick={() => setIsVisiblePassword((prev) => !prev)}
            >
              {isVisiblePassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p style={{ color: "red", margin: 0, padding: 0 }}>
              {errors.password}
            </p>
          )}
          <div style={{ position: "relative" }}>
            <input
              type={isVisibleConfirmPassword ? "text" : "password"}
              required
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }));
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              placeholder="Confirm Password"
              style={{
                width: "300px",
                height: "40px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                padding: "0 10px",
              }}
            />
            <button
              type="button"
              style={{
                position: "absolute",
                cursor: "pointer",
                right: 10,
                top: 10,
              }}
              onClick={() => setIsVisibleConfirmPassword((prev) => !prev)}
            >
              {isVisibleConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword && (
            <p style={{ color: "red", margin: 0, padding: 0 }}>
              {errors.confirmPassword}
            </p>
          )}
          <button
            type="submit"
            style={{
              width: "300px",
              height: "40px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              padding: "0 10px",
              cursor: "pointer",
              backgroundColor: "#007bff",
              color: "white",
            }}
          >
            Signup
          </button>
        </form>
      </div>
      <p style={{ marginTop: "20px" }}>
        Already have an account?{" "}
        <Link
          to="/login"
          style={{ color: "blue", textDecoration: "underline" }}
        >
          Login
        </Link>
      </p>
    </div>
  );
};

export default Signup;
