"use client";

import { IconChevronRight, IconLayoutSidebar } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { sidebarActions, sidebarStore } from "./sidebar-store";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_COLLAPSED = "3.5rem";

// Context for sidebar ID
interface SidebarContextProps {
  id: string;
  isCollapsed?: boolean;
}
const SidebarContext = React.createContext<SidebarContextProps | null>(null);

// Hook to use sidebar
export function useSidebar(id?: string) {
  const context = React.useContext(SidebarContext);
  const sidebarId = id ?? context?.id;
  const isCollapsed = context?.isCollapsed;

  if (!sidebarId) {
    throw new Error(
      "useSidebar must be called with an id or within a Sidebar component"
    );
  }

  const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);

  const effectiveSidebar = React.useMemo(() => {
    if (isCollapsed && sidebar) {
      return { ...sidebar, open: false, openMobile: false };
    }
    return sidebar;
  }, [sidebar, isCollapsed]);

  return {
    sidebar: effectiveSidebar,
    toggle: (isMobile = false) =>
      sidebarActions.toggleSidebar(sidebarId, isMobile),
    setOpen: (open: boolean, isMobile = false) =>
      sidebarActions.setOpen(sidebarId, open, isMobile),
    setVariant: (variant: "default" | "floating") =>
      sidebarActions.setVariant(sidebarId, variant),
  };
}

// Sidebar Root
interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  side?: "left" | "right";
  variant?: "default" | "floating";
  collapsible?: boolean;
  defaultOpen?: boolean;
  width?: string;
  collapsedWidth?: string;
  keyboardShortcut?: string;
  rootClassName?: string;
  isCollapsed?: boolean;
}

export function Sidebar({
  id,
  side = "left",
  variant = "default",
  collapsible = true,
  defaultOpen = true,
  width = SIDEBAR_WIDTH,
  collapsedWidth = SIDEBAR_WIDTH_COLLAPSED,
  keyboardShortcut,
  className,
  rootClassName,
  isCollapsed,
  children,
  ...props
}: SidebarProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const hasRegistered = React.useRef(false);

  // Subscribe to store state - this will have the persisted value on client
  const { sidebar } = useSidebar(id);

  // Mark when we're on the client
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Register sidebar on mount
  React.useEffect(() => {
    if (hasRegistered.current) {
      return;
    }

    const normalizedShortcut =
      keyboardShortcut && keyboardShortcut.length === 1
        ? `mod+${keyboardShortcut}`
        : keyboardShortcut;

    const existing = sidebarStore.state.sidebars[id];
    if (!existing) {
      sidebarActions.registerSidebar(id, {
        open: defaultOpen,
        variant,
        side,
        openMobile: false,
        keyboardShortcut: normalizedShortcut,
      });
    } else if (normalizedShortcut !== existing.keyboardShortcut) {
      // Update keyboard shortcut if changed
      sidebarActions.setKeyboardShortcut(id, normalizedShortcut);
    }

    hasRegistered.current = true;

    return () => {
      hasRegistered.current = false;
      sidebarActions.unregisterSidebar(id);
    };
  }, [id, defaultOpen, variant, side, keyboardShortcut]);

  // Keyboard shortcut handler
  React.useEffect(() => {
    if (!keyboardShortcut) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only support mod+key for now
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const key = keyboardShortcut.replace(/mod\+/i, "").toLowerCase();
      if (event.key.toLowerCase() === key) {
        event.preventDefault();
        sidebarActions.toggleSidebar(id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [id, keyboardShortcut]);

  // Update CSS variable when sidebar state changes
  React.useEffect(() => {
    if (sidebar) {
      const newWidth = sidebar.open ? width : collapsedWidth;
      document.documentElement.style.setProperty(
        `--sidebar-${id}-width`,
        newWidth
      );
    }
  }, [sidebar?.open, id, width, collapsedWidth, sidebar]);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Use sidebar state if available, otherwise defaultOpen
  const isOpen = isCollapsed
    ? false
    : sidebar
      ? isMobile
        ? sidebar.openMobile
        : sidebar.open
      : defaultOpen;
  const currentWidth = isOpen ? width : collapsedWidth;

  // Mobile: show Sheet
  if (isMobile) {
    return (
      <SidebarContext.Provider value={{ id, isCollapsed }}>
        <Sheet
          onOpenChange={(open) => sidebarActions.setOpen(id, open, true)}
          open={sidebar ? sidebar.openMobile : false}
        >
          <SheetContent className="w-[18rem] p-0" side={side}>
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Mobile navigation menu</SheetDescription>
            </SheetHeader>
            <div className="flex h-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      </SidebarContext.Provider>
    );
  }

  const baseStyles = "sticky top-0 h-full overflow-hidden transition-all";
  const variantRootStyles = {
    default: "",
    floating: "m-3",
  };
  const variantStyles = {
    default: "bg-sidebar",
    floating: "bg-sidebar rounded-lg border",
  };

  // Server: render skeleton with CSS variable only (no content)
  // This prevents hydration mismatch because server doesn't know localStorage state
  if (!isClient) {
    return (
      <div className={cn(variantRootStyles[variant], rootClassName)}>
        <aside
          className={cn(baseStyles, variantStyles[variant], className, "")}
          data-side={side}
          data-sidebar-id={id}
          data-variant={variant}
          style={{
            width: `var(--sidebar-${id}-width, ${isCollapsed ? collapsedWidth : defaultOpen ? width : collapsedWidth})`,
            minWidth: `var(--sidebar-${id}-width, ${isCollapsed ? collapsedWidth : defaultOpen ? width : collapsedWidth})`,
            maxWidth: `var(--sidebar-${id}-width, ${isCollapsed ? collapsedWidth : defaultOpen ? width : collapsedWidth})`,
          }}
          {...props}
        >
          {/* Skeleton - no content on server */}
          <div
            className="flex h-full flex-col overflow-hidden"
            style={{
              width: `var(--sidebar-${id}-width, ${isCollapsed ? collapsedWidth : defaultOpen ? width : collapsedWidth})`,
            }}
          />
        </aside>
      </div>
    );
  }

  // Client: render full sidebar with content
  return (
    <SidebarContext.Provider value={{ id, isCollapsed }}>
      <TooltipProvider delayDuration={0}>
        <div className={cn(variantRootStyles[variant], rootClassName)}>
          <aside
            className={cn(baseStyles, variantStyles[variant], className)}
            data-side={side}
            data-sidebar-id={id}
            data-state={isOpen ? "expanded" : "collapsed"}
            data-variant={variant}
            style={{
              width: `var(--sidebar-${id}-width, ${currentWidth})`,
              minWidth: `var(--sidebar-${id}-width, ${currentWidth})`,
              maxWidth: `var(--sidebar-${id}-width, ${currentWidth})`,
            }}
            {...props}
          >
            <div
              className="flex h-full flex-col overflow-hidden"
              style={{ width: `var(--sidebar-${id}-width, ${currentWidth})` }}
            >
              {children}
            </div>
          </aside>
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

// Sidebar Header
export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-0.5 p-2", className)} {...props} />
  );
}

// Sidebar Content
export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto overflow-x-hidden p-2", className)}
      {...props}
    />
  );
}

// Sidebar Footer
export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto border-t p-2", className)} {...props} />;
}

// Sidebar Group
export function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

// Sidebar Group Label
export function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 font-medium text-muted-foreground text-xs",
        className
      )}
      {...props}
    />
  );
}

// Sidebar Menu
export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("0.5 flex flex-col", className)} {...props} />;
}

// Sidebar Menu Item
interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  isActive?: boolean;
  isCollapsed?: boolean;
  showWhenCollapsed?: boolean;
  hideWhenCollapsed?: boolean;
}

export function SidebarMenuItem({
  className,
  isActive,
  isCollapsed,
  showWhenCollapsed,
  hideWhenCollapsed,
  children,
  ...props
}: SidebarMenuItemProps) {
  const { sidebar } = useSidebar();
  const collapsed = sidebar && !sidebar.open;

  // Hide when collapsed if hideWhenCollapsed is true
  if (hideWhenCollapsed && collapsed) {
    return null;
  }

  // Hide when expanded if showWhenCollapsed is true
  if (showWhenCollapsed && !collapsed) {
    return null;
  }

  return (
    <li
      className={cn(
        "relative flex w-full shrink-0 items-center gap-1 px-1 duration-150",
        "group/item flex w-full flex-1 items-center justify-start gap-3 rounded-lg text-left text-sm transition-all",

        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "bg-accent font-medium text-accent-foreground",
        (isCollapsed || collapsed) && "aspect-square justify-center",

        className
      )}
      data-active={isActive}
      {...props}
    >
      {children}
    </li>
  );
}

// Sidebar Menu Sub
export function SidebarMenuSub({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { sidebar } = useSidebar();
  const isCollapsed = sidebar && !sidebar.open;

  if (isCollapsed) {
    return null;
  }

  return (
    <div className={cn("flex w-fit items-center gap-1", className)} {...props}>
      {children}
    </div>
  );
}

// Sidebar Menu Button
interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
  size?: "default" | "large";
}

export function SidebarMenuButton({
  isActive,
  tooltip,
  icon,
  className,
  children,
  size,
  ...props
}: SidebarMenuButtonProps) {
  const { sidebar } = useSidebar();
  const isCollapsed = sidebar && !sidebar.open;

  const button = (
    <button
      className={cn(
        "flex w-full flex-1 items-center justify-start gap-3 rounded-lg p-2 text-left text-inherit transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
        size === "large" && "py-3 font-semibold",
        isActive && "bg-accent font-medium text-accent-foreground",
        isCollapsed && "aspect-square justify-center",
        className
      )}
      data-active={isActive}
      type="button"
      {...props}
    >
      {icon && (
        <span className={cn("[&>svg]:size-4 [&>svg]:shrink-0")}>{icon}</span>
      )}
      {children
        ? !isCollapsed && <span className="flex-1 truncate">{children}</span>
        : null}
    </button>
  );

  if (isCollapsed && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// Sidebar Submenu
interface SidebarSubmenuProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  forcePopup?: boolean;
}

export function SidebarSubmenu({
  label,
  icon,
  defaultOpen = false,
  className,
  children,
  forcePopup = false,
  ...props
}: SidebarSubmenuProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const { sidebar } = useSidebar();
  const isCollapsed = sidebar && !sidebar.open;

  const trigger = (
    <button
      className={cn(
        "flex w-full min-w-full flex-1 items-center justify-start gap-3 rounded-lg p-2 text-left text-inherit transition-all duration-150",
        "hover:bg-accent hover:font-medium hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
        !isCollapsed && isOpen && "bg-accent font-medium text-accent-foreground"
      )}
      onClick={() => !(isCollapsed || forcePopup) && setIsOpen(!isOpen)}
      type="button"
    >
      {icon && <span className={cn("shrink-0", "[&>svg]:size-4")}>{icon}</span>}
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          <IconChevronRight
            className={cn(
              "size-4 transition-all",
              isOpen ? "rotate-90 transition-all" : ""
            )}
          />
        </>
      )}
    </button>
  );

  if (forcePopup) {
    return (
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ) : (
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        )}

        <PopoverContent align="start" className="w-48 p-0" side="right">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 border-b p-3 font-semibold text-sm">
              {icon && (
                <span className={cn("shrink-0", "[&>svg]:size-4")}>{icon}</span>
              )}
              {label}
            </div>
            <div className="flex flex-col gap-0.5 p-1">{children}</div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      {trigger}
      {isOpen && (
        <div className="mt-1 ml-3 flex flex-col gap-0.5 border-l pl-3">
          {children}
        </div>
      )}
    </div>
  );
}

// Sidebar Submenu Item
export function SidebarSubmenuItem({
  isActive,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
        isActive && "bg-accent font-medium text-accent-foreground",
        className
      )}
      data-active={isActive}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

// Sidebar Trigger
export function SidebarTrigger({
  sidebarId: propSidebarId,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { sidebarId?: string }) {
  const context = React.useContext(SidebarContext);
  const sidebarId = propSidebarId ?? context?.id;

  if (!sidebarId) {
    throw new Error(
      "SidebarTrigger must be used within a Sidebar component or passed a sidebarId prop"
    );
  }

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <Button
      className={cn("", className)}
      onClick={() => sidebarActions.toggleSidebar(sidebarId, isMobile)}
      size="icon"
      variant="ghost"
      {...props}
    >
      <IconLayoutSidebar className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
