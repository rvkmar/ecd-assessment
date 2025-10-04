import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-gray-100 border-t py-3 text-center text-sm text-gray-600 mt-8">
      © All rights reserved. {new Date().getFullYear()} Assessment by  <a href="mailto:rvkmar@gmail.com"> Ravikumar Rajabhather</a>, Lecturer, <a href="https://www.dietchn.ac.in" target="_blank"> DIET Chennai</a>, Tamil Nadu, India. 
    </footer>
  );
}
