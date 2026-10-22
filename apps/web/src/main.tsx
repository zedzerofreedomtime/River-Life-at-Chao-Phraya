import React from "react";
import ReactDOM from "react-dom/client";
import {
  ThemeProvider,
  createTheme,
  StyledEngineProvider,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App";
import "./styles.css";
import "./Cinematic.css";
import "./ColorSystem.css";
import "./Typography.css";
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#c9ad7c",
      light: "#e4c78f",
      dark: "#d6b779",
      contrastText: "#080e19",
    },
    secondary: { main: "#b3c0d0" },
    background: { default: "#080e19", paper: "#121e2c" },
    text: { primary: "#f5f6f8", secondary: "#b3c0d0" },
  },
  typography: {
    fontFamily: '"DM Sans", "Kanit", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiAlert: { styleOverrides: { message: { minWidth: 0 } } },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);
