import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./index.css";
import Notes from "./routes/Notes";
import Patients from "./routes/Patients";
import Practitioners from "./routes/Practitioners";
import { AppStateProvider } from "./state";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Practitioners /> },
      { path: "patients", element: <Patients /> },
      { path: "notes", element: <Notes /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppStateProvider>
      <RouterProvider router={router} />
    </AppStateProvider>
  </StrictMode>
);
