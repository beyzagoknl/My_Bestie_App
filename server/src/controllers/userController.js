import User from "../models/UserModels.js";
import validationErrorMessage from "../util/validationErrorMessage.js";
import { EXPIRES_IN } from "../util/constants.js";
import {
  validateUser,
  validatePasswordLength,
  validatePasswordStrength,
} from "../util/validateUser.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// @desc  create a new user account
// @route POST /api/user
// @access  public
export const createUser = async (req, res) => {
  try {
    const user = req.body;
    // if the user did not provide a right json object, it is a bad request
    if (typeof user !== "object") {
      res.status(400).json({
        success: false,
        message: `You need to provide a 'user' object. Received: ${JSON.stringify(
          user
        )}`,
      });
      return;
    }

    // check that all the fields the user provided are allowed,
    // and all the required fields are present inside the user object
    const errorList = validateUser(user);

    if (errorList.length > 0) {
      return res
        .status(400)
        .json({ success: false, msg: validationErrorMessage(errorList) });
    } else {
      // check if a user with the given username already exists
      const userExists = await User.findOne({ email: user.email });

      // if yes then it is a bad request (code 400)
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: `A user with the email address '${userExists.email}' already exists`,
        });
      }
      // validate the password before hashing

      const customErrors = validateUser(user);
      if (Object.keys(customErrors).length > 0) {
        return res.status(400).json({
          success: false,
          message: "unable to create user",
          errors: customErrors,
        });
      }

      // hash the password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(user.password, salt);

      // create a new user
      const newUser = await User.create({
        ...user,
        password: hashedPassword,
      });
      if (newUser) {
        const accessToken = jwt.sign(
          { id: newUser._id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: EXPIRES_IN }
        );

        return res.status(201).json({
          success: true,
          id: newUser._id,
          firstName: newUser.firstName,
          surname: newUser.surname,
          email: newUser.email,
          image: newUser.image,
          accessToken: accessToken,
        });
      } else {
        // if an error occurred while creating a new user, something has to do with the server
        return res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      }
    }
  } catch (error) {
    // Get all validation errors and send them along with the response
    let errors = {};
    for (let key in error.errors) {
      errors[key] = error.errors[key].properties.message;
    }

    if (!validatePasswordLength(req.body.password)) {
      errors.password =
        "password is too short. Should be at least 8 characters";
    } else if (!validatePasswordStrength(req.body.password)) {
      errors.password = "password is too weak";
    }

    return res
      .status(400)
      .json({ success: false, message: "Unable to create user!", errors });
  }
};

// @desc  authenticate a user
// @route POST /api/user/login
// @access  public
export const login = async (req, res) => {
  try {
    const credentials = req.body;

    // if the email or password is missing, then it is a bad request
    if (
      !Object.keys(credentials).includes("email") ||
      !Object.keys(credentials).includes("password")
    ) {
      return res
        .status(400)
        .json({ message: "Both email and password are required" });
    }

    // find a user in the database with the given email
    const user = await User.findOne({
      email: credentials.email,
    });

    // after checking the email, check if the given password is correct
    if (user && (await bcrypt.compare(credentials.password, user.password))) {
      // if the user has provided correct credentials then generate a json web token for him

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: EXPIRES_IN }
      );

      return res.status(200).json({
        id: user._id,
        firstName: user.firstName,
        surname: user.surname,
        email: user.email,
        image: user.image,
        accessToken: accessToken,
      });
    } else {
      // otherwise return an unauthorized request
      return res.status(401).json({
        success: false,
        message: "email and/or password is incorrect",
      });
    }
  } catch (err) {
    // for all other kinds of errors, treat them as internal server errors (code 500)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// @desc validate the current user's token.
// @route POST /api/user/validate
// @access private
export const validateToken = async (req, res) => {
  try {
    let token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};
