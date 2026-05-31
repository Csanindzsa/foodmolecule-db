import React from "react";
import { Box, Button, ButtonProps } from "@mui/material";
import koFiButtonImage from "../assets/images/support_me_on_kofi_beige.png";

type KoFiButtonProps = ButtonProps & {
  compact?: boolean;
  href?: string;
  target?: string;
  rel?: string;
};

const KoFiButton: React.FC<KoFiButtonProps> = ({
  compact = false,
  sx,
  ...buttonProps
}) => {
  const mergedSx = [
    {
      p: 0,
      minWidth: 0,
      borderRadius: 999,
      lineHeight: 0,
      overflow: "visible",
      bgcolor: "transparent",
      boxShadow: "none",
      transition: "transform 160ms ease, filter 160ms ease",
      "&:hover": {
        bgcolor: "transparent",
        transform: "translateY(-1px)",
        filter: "brightness(1.03)",
      },
      "&:active": {
        transform: "translateY(1px)",
      },
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];

  return (
    <Button {...buttonProps} sx={mergedSx}>
      <Box
        component="img"
        src={koFiButtonImage}
        alt="Support me on Ko-fi"
        sx={{
          display: "block",
          width: compact ? 210 : "100%",
          maxWidth: compact ? 210 : 360,
          height: "auto",
        }}
      />
    </Button>
  );
};

export default KoFiButton;
