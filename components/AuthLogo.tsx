import Image from "next/image";

/** The pixel rose that opens every sign-in style page (start, welcome back, sign in, personal link). */
export function AuthLogo() {
  return (
    <Image
      src="/brand/pixelinvite-bud.png"
      alt="PixelInvite"
      width={37}
      height={80}
      priority
      style={{ display: "block", margin: "0 auto 14px", height: 80, width: "auto" }}
    />
  );
}
