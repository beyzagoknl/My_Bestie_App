import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { url } from "./api";

const initialState = {
  user: JSON.parse(localStorage.getItem("user")),
  registerStatus: "",
  registerError: "",
  loginStatus: "",
  loginError: "",
  userLoaded: false,
  invalidToken: null,
  updateStatus: "",
  updateError: "",
};

export const registerUser = createAsyncThunk(
  "user/createUser",
  async (values, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${url}/api/user/create`, {
        firstName: values.firstName,
        surname: values.surname,
        email: values.email,
        password: values.password,
        image: values.image,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const loginUser = createAsyncThunk(
  "user/loginUser",
  async (values, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${url}/api/user/login`, {
        email: values.email,
        password: values.password,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const validateToken = createAsyncThunk(
  "user/validateToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.user.accessToken;
      const res = await axios.post(
        `${url}/api/user/login`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "user/logout",
  async (_, { rejectWithValue }) => {
    try {
      await localStorage.removeItem("user");
      return;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(validateToken.pending, (state) => {
      return { ...state, loginStatus: "pending", invalidToken: null };
    });
    builder.addCase(validateToken.rejected, (state) => {
      localStorage.removeItem("user");
      return {
        ...state,
        loginStatus: "invalid",
        user: null,
        invalidToken: true,
      };
    });
    builder.addCase(validateToken.fulfilled, (state) => {
      return state;
    });
    builder.addCase(registerUser.pending, (state) => {
      return { ...state, registerStatus: "pending" };
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      localStorage.setItem("user", JSON.stringify(action.payload));

      return {
        ...state,
        user: action.payload,
        registerStatus: "success",
      };
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      return {
        ...state,
        registerStatus: "rejected",
        registerError: action.payload,
      };
    });
    builder.addCase(loginUser.pending, (state) => {
      return {
        ...state,
        invalidToken: null,
        loginStatus: "pending",
      };
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      localStorage.setItem("user", JSON.stringify(action.payload));

      return {
        ...state,
        user: action.payload,
        loginStatus: "success",
      };
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      return {
        ...state,
        loginStatus: "rejected",
        invalidToken: null,
        loginError: action.payload,
      };
    });
    builder.addCase(logoutUser.fulfilled, (state, action) => {
      return {
        ...state,
        user: null,
        invalidToken: action.payload,
      };
    });
  },
});

export const { reset, updateError, isSuccess } = authSlice.actions;

export default authSlice.reducer;
