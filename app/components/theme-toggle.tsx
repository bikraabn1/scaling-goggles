import { useState, useEffect } from "react";
import { Contrast } from "lucide-react";
import { Button } from "~/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={toggleTheme}
      className={`h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground ${className || ""}`}
      title={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      aria-label="Toggle theme"
    >
      <Contrast className="h-4 w-4 transition-transform duration-300 hover:rotate-180" />
    </Button>
  );
}
