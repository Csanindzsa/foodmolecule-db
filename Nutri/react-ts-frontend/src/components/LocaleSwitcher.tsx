import React from "react";
import {
  Box,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import CheckIcon from "@mui/icons-material/Check";
import { supportedLocales } from "../localization";
import { useLocale } from "../localization/useLocale";
import { LocaleCode } from "../localization/types";

type LocaleSwitcherProps = {
  compact?: boolean;
};

const LocaleSwitcher = ({ compact = false }: LocaleSwitcherProps) => {
  const { locale, localeCode, setLocaleCode } = useLocale();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (code: LocaleCode) => {
    setLocaleCode(code);
    handleClose();
  };

  return (
    <>
      <Tooltip title={locale.common.selectLanguage}>
        <IconButton
          color="inherit"
          aria-label={locale.common.selectLanguage}
          aria-controls={isOpen ? "locale-switcher-menu" : undefined}
          aria-haspopup="menu"
          aria-expanded={isOpen ? "true" : undefined}
          onClick={handleOpen}
          sx={{
            ml: compact ? 0 : 1,
            mr: compact ? 1 : 0,
            minWidth: compact ? 42 : 58,
            height: 42,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.45)",
            color: "#fff",
            gap: 0.5,
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.14)",
            },
          }}
        >
          <LanguageIcon fontSize="small" />
          {!compact && (
            <Typography
              component="span"
              sx={{
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1,
                minWidth: 22,
                textTransform: "uppercase",
              }}
            >
              {localeCode === "zh-CN" ? "ZH" : localeCode}
            </Typography>
          )}
        </IconButton>
      </Tooltip>

      <Menu
        id="locale-switcher-menu"
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        MenuListProps={{
          "aria-label": locale.common.language,
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1,
            width: 260,
            maxHeight: 420,
            borderRadius: 2,
            border: "1px solid rgba(255,140,0,0.2)",
          },
        }}
      >
        {supportedLocales.map((option) => (
          <MenuItem
            key={option.code}
            selected={option.code === localeCode}
            onClick={() => handleSelect(option.code)}
            dir={option.direction}
            sx={{
              gap: 1.25,
              minHeight: 44,
              "&.Mui-selected": {
                bgcolor: "rgba(255,140,0,0.12)",
              },
              "&.Mui-selected:hover": {
                bgcolor: "rgba(255,140,0,0.18)",
              },
            }}
          >
            <Box sx={{ width: 20, display: "flex", color: "#f57c00" }}>
              {option.code === localeCode && <CheckIcon fontSize="small" />}
            </Box>
            <ListItemText
              primary={option.nativeName}
              secondary={option.englishName}
              primaryTypographyProps={{ fontWeight: 700 }}
              secondaryTypographyProps={{ fontSize: 12 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LocaleSwitcher;
