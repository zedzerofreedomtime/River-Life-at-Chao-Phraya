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
const theme = createTheme({
  palette: {
    primary: { main: "#aa8040", contrastText: "#fff" },
    secondary: { main: "#101e32" },
  },
  typography: {
    fontFamily: '"Noto Sans Thai", Arial, sans-serif',
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
