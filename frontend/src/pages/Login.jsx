import { useState } from "react";
import { Link } from "react-router-dom";
import validate from "../utils/validate";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const emailError = validate.email(email);
    const passwordError = validate.password(password);

    setErrors({
      email: emailError || "",
      password: passwordError || "",
    });

    if (emailError || passwordError) {
      return;
    }

    console.log("Login successful");

    setEmail("");
    setPassword("");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: "white",
        padding: "24px 16px",
        flexDirection: "column",
        backgroundColor: "black",
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
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
          noValidate
        >
          <input
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
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

          <input
            required
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: "" }));
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
          {errors.password && (
            <p style={{ color: "red", margin: 0, padding: 0 }}>
              {errors.password}
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
              backgroundColor: "#007bff",
              color: "white",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>
      </div>
      <p style={{ marginTop: "20px" }}>
        Don't have an account?{" "}
        <Link
          to="/signup"
          style={{ color: "blue", textDecoration: "underline" }}
        >
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default Login;
