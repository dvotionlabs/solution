import { Search } from "@/components/Search";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { samples } = await searchParams;
  const withSamples = samples === "1";

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:pt-20">
      {withSamples && (
        <p className="mb-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          Preview mode: results include sample profiles that are not shown to the public.
        </p>
      )}
      <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-[3.6rem]">
        Find your professional.
      </h1>
      <div className="mt-8 sm:mt-10">
        <Search samples={withSamples} />
      </div>
    </div>
  );
}
