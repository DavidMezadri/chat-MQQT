import { useState } from "react";
import ButtonAppBar from "../../components/ButtonAppBar/ButtonAppBar";
import SideAppBar from "../../components/SideAppBar/SideAppBar";

export default function Conversation() {
  const [positionMenu, setPositionMenu] = useState(false);
  return (
    <>
      <ButtonAppBar onMenuClick={() => setPositionMenu(!positionMenu)} />
      <SideAppBar open={positionMenu} />
    </>
  );
}
