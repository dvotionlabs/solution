import { Search } from "@/components/Search";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Find your professional.</h1>
      <div className="mt-8">
        <Search />
      </div>
    </div>
  );
}
