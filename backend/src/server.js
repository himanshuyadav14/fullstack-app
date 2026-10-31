require("dotenv").config();

const express = require("express");
const dbConnect = require("./config/db");
const seedRoles = require("./seed/seedRoles");

//Routes Import
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleRoutes");

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);

const startServer = async () => {
  try {
    await dbConnect();
    await seedRoles();
    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌Server startup failed", err.message);
    process.exit(1);
  }
};

startServer();
