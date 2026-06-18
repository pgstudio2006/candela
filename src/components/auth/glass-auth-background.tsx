import Image from "next/image";

export function GlassAuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <Image
        src="/auth-sky-bg.png"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-sky-100/10" />
    </div>
  );
}
