import { Toaster as Sonner } from "sonner"

// Le site est dark premium : on force le thème dark (pas de next-themes ici).
function Toaster({ ...props }) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      }}
      {...props}
    />
  )
}

export { Toaster }
