import Link from "next/link";
import Image from "next/image";

import { CallControls, SpeakerLayout } from "@stream-io/video-react-sdk";

interface Props {
  onLeave: () => void;
  meetingName: string;
}

export const CallActive = ({ onLeave, meetingName }: Props) => {
  return (
    <div className="flex flex-col justify-between p-4 h-full text-white">
      <div className="bg-[#101213] rounded-full p-4 flex items-center gap-4 w-full">
        <Link
          href="/"
          className="flex items-center justify-center gap-1 px-3 py-1 bg-white/10 rounded-full w-fit"
        >
          <Image src="/logo.svg" width={22} height={22} alt="Logo" />
          <h4 className="text-base">{meetingName}</h4>
        </Link>
      </div>
      <SpeakerLayout />
      <div className="bg-[#101213] rounded-full px-4 w-full">
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  );
};
