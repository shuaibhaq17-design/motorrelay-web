// app/layout.js
import "./globals.css";
import "leaflet/dist/leaflet.css";
import NavShell from "./NavShell";

export const metadata = {
  title: "MotorRelay",
  description: "MotorRelay web app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* top-nav appears on sm+; app bar appears on <sm */}
      <body className="bg-gray-50 text-gray-900">
        <NavShell>{children}</NavShell>
      </body>
    </html>
  );
}
