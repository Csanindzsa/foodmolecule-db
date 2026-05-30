import React, { ReactNode } from "react";
import { Box } from "@mui/material";

interface CarrotBackgroundProps {
  children: ReactNode;
  opacity?: number;
  backgroundSize?: string;
}

const CarrotBackground: React.FC<CarrotBackgroundProps> = ({
  children,
  opacity = 0.15,
  backgroundSize = "cover", // Changed from "200px" to "cover"
}) => {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        "&::before": {
          content: '""',
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(180deg, rgba(255, 248, 240, 0.55), rgba(245, 255, 247, 0.55))",
          backgroundRepeat: "no-repeat", // Changed from "repeat" to "no-repeat"
          backgroundSize: backgroundSize,
          backgroundPosition: "center center", // Added to ensure the image is centered
          opacity,
          zIndex: -1,
        },
      }}
    >
      {children}
    </Box>
  );
};

export default CarrotBackground;
