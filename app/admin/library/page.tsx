import { MediaLibrary } from "@/components/admin/media-library";

export const metadata = { title: "Library" };

export default function AdminLibraryPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="heading-display text-2xl font-semibold text-ink">Library</h1>
        <p className="mt-1 text-sm text-umber">
          Every image and video uploaded for the store. Uploads are compressed automatically and
          served from the CDN; deleting here removes the file everywhere it&rsquo;s used.
        </p>
      </header>
      <MediaLibrary manage />
    </div>
  );
}
