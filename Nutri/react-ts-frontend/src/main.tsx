import React from "react";
import ReactDOM from "react-dom/client";
import App from "./pages/App";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import { BrowserRouter as Router } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LocaleProvider } from "./localization/LocaleProvider";

const rootElement = document.getElementById("root") as HTMLElement;

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <LocaleProvider>
        <Router>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </Router>
      </LocaleProvider>
    </HelmetProvider>
  </React.StrictMode>
);
