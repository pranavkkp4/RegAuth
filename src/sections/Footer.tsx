export default function Footer() {
  return (
    <footer id="footer" className="w-full border-t border-[#DDE3EE] bg-[#F5F7FA] py-12">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-[4vw] sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-xl text-[#1A1F71]">
          RegAuth
        </span>
        <span className="text-sm font-light text-[#667085]">
          Forward Auth regression robustness and AI-assisted Karate authoring case study.
        </span>
      </div>
    </footer>
  );
}
