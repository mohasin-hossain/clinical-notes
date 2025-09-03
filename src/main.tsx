import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import Notes from "./routes/Notes.tsx";
import Patients from "./routes/Patients.tsx";
import Practitioners from "./routes/Practitioners.tsx";
import { AppStateProvider } from "./state.tsx";

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
