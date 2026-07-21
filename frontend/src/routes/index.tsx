import { createFileRoute } from "@tanstack/react-router";
import { Check, Moon, Plus, Sun, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");

  const todos = trpc.todos.list.useQuery();

  const create = trpc.todos.create.useMutation({
    onSuccess: () => {
      setTitle("");
      utils.todos.list.invalidate();
    },
  });

  const update = trpc.todos.update.useMutation({
    onSuccess: () => utils.todos.list.invalidate(),
  });

  const remove = trpc.todos.remove.useMutation({
    onSuccess: () => utils.todos.list.invalidate(),
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">App</h1>
          <p className="mt-1 text-sm text-gray-500">
            A greenfield starter. Todos, end-to-end, over tRPC.
          </p>
        </div>
        <DarkModeToggle />
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = title.trim();
          if (!trimmed) return;
          create.mutate({ title: trimmed });
        }}
        className="mb-6 flex gap-2"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="flex-1 rounded-md border border-gray-200 bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
        <Button type="submit" disabled={create.isPending || !title.trim()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      {todos.isPending ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : todos.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
          Couldn't reach the API. Is the backend running? Check the
          terminal panel.
          <div className="mt-1 font-mono text-xs opacity-70">
            {todos.error.message}
          </div>
        </div>
      ) : todos.data.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          No todos yet. Add one above.
        </div>
      ) : (
        <ul className="space-y-2">
          {todos.data.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-md border border-gray-200 bg-surface p-3"
            >
              <button
                type="button"
                onClick={() => update.mutate({ id: t.id, done: !t.done })}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  t.done
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300 hover:border-primary-500"
                }`}
                aria-label={t.done ? "Mark as not done" : "Mark as done"}
              >
                {t.done ? <Check className="h-4 w-4" /> : null}
              </button>
              <span
                className={`flex-1 text-sm ${
                  t.done ? "text-gray-400 line-through" : ""
                }`}
              >
                {t.title}
              </span>
              <button
                type="button"
                onClick={() => remove.mutate({ id: t.id })}
                className="text-gray-400 hover:text-red-600"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle color scheme">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
