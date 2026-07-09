import type { Offer } from "@smartwakacje/shared";
import { useStore } from "../store/useStore";
import { trpc } from "../trpc";

export function FavoriteButton({
  name,
  hotelId,
  offer,
  size = "sm",
}: {
  name: string;
  hotelId?: number;
  offer?: Offer;
  size?: "sm" | "lg";
}) {
  const isFavorite = useStore((s) => s.favorites.has(name));
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  // @ts-expect-error - tRPC type inference issue with monorepo
  const mutation = trpc.favorites.toggle.useMutation({
    onError: () => {
      toggleFavorite(name); // rollback optimistic update
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(name);
    mutation.mutate({ name, hotelId, offer });
  };

  const dim = size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const iconDim = size === "lg" ? "w-5 h-5" : "w-4 h-4";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${dim} rounded-full flex items-center justify-center transition-all ${
        isFavorite
          ? "bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30"
          : "bg-black/40 text-sand-dim/70 border border-white/10 backdrop-blur hover:text-gold hover:bg-black/55"
      }`}
      aria-label={isFavorite ? "Usun z ulubionych" : "Dodaj do ulubionych"}
    >
      <svg
        viewBox="0 0 24 24"
        className={iconDim}
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
      </svg>
    </button>
  );
}
