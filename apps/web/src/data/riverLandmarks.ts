export type RiverDirection = "upstream" | "downstream";
export type RiverBank = "west" | "east" | "crossing";
export type RiverLandmark = {
  id: string;
  th: string;
  en: string;
  bank: RiverBank;
  eraTh: string;
  eraEn: string;
  historyTh: string;
  historyEn: string;
  viewTh: string;
  viewEn: string;
  source: string;
  sourceLabel: string;
  image: string;
  position?: string;
};

// Numbering follows the supplied reference poster, NOT a promised sailing order.
export const riverLandmarks: readonly RiverLandmark[] = [
  {
    id: "rama-viii",
    th: "สะพานพระราม 8",
    en: "Rama VIII Bridge",
    bank: "crossing",
    eraTh: "เปิดใช้ พ.ศ. 2545",
    eraEn: "Opened in 2002",
    historyTh:
      "สะพานขึงที่เกิดจากโครงการพระราชดำริเพื่อช่วยบรรเทาการจราจรบนสะพานสมเด็จพระปิ่นเกล้า เชื่อมฝั่งพระนครกับฝั่งธนบุรี เริ่มเปิดให้รถใช้วันที่ 7 พฤษภาคม พ.ศ. 2545 โดยมีเสาสูงและแนวสายเคเบิลเป็นจุดเด่นของเส้นขอบฟ้าริมน้ำ",
    historyEn:
      "Developed under a royal initiative to ease traffic on Pinklao Bridge, this cable-stayed crossing links Bangkok’s two riverbanks. It opened to traffic on 7 May 2002; its tall pylon and sweeping cables define the riverside skyline.",
    viewTh:
      "มองแนวสายเคเบิลเมื่อเข้าใกล้สะพาน หากเรือลอดใต้จะเห็นเหนือศีรษะ ไม่ใช่สถานที่ที่อยู่ซ้ายหรือขวาฝั่งเดียว",
    viewEn:
      "Look ahead for the cables on approach. If the sailing passes underneath, the bridge is overhead rather than on one bank.",
    source: "https://projects.rdpb.go.th/projects/6458538851303424/-",
    sourceLabel: "สำนักงาน กปร.",
    image: "/images/landmarks/guide/rama-viii.jpg",
  },
  {
    id: "wat-arun",
    th: "วัดอรุณราชวราราม",
    en: "Wat Arun",
    bank: "west",
    eraTh: "วัดเก่าสมัยอยุธยา",
    eraEn: "Ayutthaya-period origins",
    historyTh:
      "วัดเก่าริมฝั่งธนบุรีที่มีประวัติย้อนไปถึงสมัยอยุธยา เป็นที่รู้จักในชื่อวัดแจ้ง พระปรางค์ใหญ่ซึ่งพัฒนารูปแบบในช่วงต้นกรุงรัตนโกสินทร์ประดับด้วยกระเบื้องเคลือบและเครื่องถ้วย เป็นหนึ่งในสัญลักษณ์สำคัญของเจ้าพระยา",
    historyEn:
      "A temple with Ayutthaya-period origins on the Thonburi bank, also known as the Temple of Dawn. Its early-Rattanakosin monumental prang, decorated with glazed ceramics and porcelain, is one of the Chao Phraya’s defining landmarks.",
    viewTh:
      "พระปรางค์เป็นจุดเด่นที่มองเห็นจากแม่น้ำได้ชัดในช่วงที่เรือผ่านด้านหน้าวัด แสงประดับขึ้นอยู่กับวันและเวลา",
    viewEn:
      "The riverside prang is the main subject as the boat passes the temple frontage. Illumination depends on the date and time.",
    source:
      "https://www.tourismthailand.org/Attraction/phraprang-wat-arun-ratchawararam-ratchawora-mahawi",
    sourceLabel: "Tourism Authority of Thailand",
    image: "/images/landmarks/wat-arun-riverside-hq.webp",
  },
  {
    id: "grand-palace",
    th: "พระบรมมหาราชวัง",
    en: "The Grand Palace",
    bank: "east",
    eraTh: "เริ่มสร้าง พ.ศ. 2325",
    eraEn: "Established in 1782",
    historyTh:
      "รัชกาลที่ 1 โปรดเกล้าฯ ให้สร้างเมื่อสถาปนากรุงรัตนโกสินทร์ใน พ.ศ. 2325 เพื่อเป็นที่ประทับและศูนย์กลางราชการ ภายในประกอบด้วยหมู่พระที่นั่งและวัดพระศรีรัตนศาสดาราม สะท้อนบทบาทของย่านพระนครในฐานะศูนย์กลางของราชธานี",
    historyEn:
      "Commissioned by King Rama I in 1782 with the founding of Rattanakosin, the complex served as a royal residence and administrative centre. Its throne halls and Chapel Royal reflect the historic role of Bangkok’s old city.",
    viewTh:
      "จากแม่น้ำอาจเห็นแนวหลังคาและยอดอาคารบางส่วน ไม่ใช่ภาพลานพระราชวังทั้งหมด ภาพประกอบเป็นภาพสถานที่จากอีกมุมหนึ่ง",
    viewEn:
      "Only parts of the roofline and spires may be visible from the river, not the palace courtyards. The photograph illustrates the site from another viewpoint.",
    source: "https://www.royalgrandpalace.th/en/discover/history/",
    sourceLabel: "The Grand Palace",
    image: "/images/landmarks/guide/grand-palace.jpg",
  },
  {
    id: "wat-kalayanamit",
    th: "วัดกัลยาณมิตรวรมหาวิหาร",
    en: "Wat Kalayanamit",
    bank: "west",
    eraTh: "สร้าง พ.ศ. 2368",
    eraEn: "Founded in 1825",
    historyTh:
      "เจ้าพระยานิกรบดินทร์ (โต กัลยาณมิตร) สร้างวัดใน พ.ศ. 2368 สมัยรัชกาลที่ 3 แล้วถวายเป็นพระอารามหลวง วัดเป็นที่ประดิษฐานพระพุทธไตรรัตนนายก หรือหลวงพ่อโต และสัมพันธ์กับประวัติชุมชนไทย–จีนริมฝั่งธนบุรี",
    historyEn:
      "Founded in 1825 during Rama III’s reign by Chao Phraya Nikornbodin (To Kalayanamit), then presented as a royal temple. It houses Phra Buddha Trai Rattananayok, known as Luang Pho To, and is associated with Thonburi’s Thai–Chinese riverside community.",
    viewTh:
      "มองกลุ่มอาคารและวิหารริมแม่น้ำ ภาพพระประธานภายในไม่ใช่สิ่งที่มองเห็นจากบนเรือ",
    viewEn:
      "Look for the temple halls along the waterfront. The Buddha inside the main hall cannot be viewed from the boat.",
    source: "https://www.thailandtourismdirectory.go.th/en/attraction/103270",
    sourceLabel: "Thailand Tourism Directory",
    image: "/images/landmarks/guide/wat-kalayanamit.jpg",
  },
  {
    id: "wat-pho",
    th: "วัดพระเชตุพนฯ (วัดโพธิ์)",
    en: "Wat Pho",
    bank: "east",
    eraTh: "บูรณะใหญ่สมัย ร.1 และ ร.3",
    eraEn: "Restored under Rama I & III",
    historyTh:
      "พัฒนาจากวัดโพธารามเดิม ผ่านการบูรณะสำคัญในสมัยรัชกาลที่ 1 และรัชกาลที่ 3 เป็นแหล่งศิลปกรรมและการรวบรวมองค์ความรู้ของไทย มีพระพุทธไสยาสน์และกลุ่มพระมหาเจดีย์เป็นองค์ประกอบสำคัญของวัด",
    historyEn:
      "Developed from the earlier Wat Photharam, with major restorations under Rama I and Rama III. The temple became a repository of Thai arts and knowledge, with its reclining Buddha and great chedis among its best-known features.",
    viewTh:
      "วัดไม่ได้เปิดมุมมองทั้งบริเวณสู่แม่น้ำ อาคารอาจบังทัศนวิสัย ภาพเจดีย์นี้ถ่ายภายในวัด ไม่ใช่มุมรับประกันจากเรือ และไม่เห็นพระนอนจากแม่น้ำ",
    viewEn:
      "Riverside buildings can obstruct the view. This chedi photograph was taken inside the temple, not from the boat; the reclining Buddha is not visible from the river.",
    source: "https://www.watpho.org/en/history",
    sourceLabel: "Wat Pho",
    image: "/images/landmarks/guide/wat-pho.jpg",
    position: "50% 58%",
  },
  {
    id: "memorial-bridge",
    th: "สะพานพระพุทธยอดฟ้า",
    en: "Memorial Bridge",
    bank: "crossing",
    eraTh: "เปิด พ.ศ. 2475",
    eraEn: "Opened in 1932",
    historyTh:
      "รู้จักกันในชื่อสะพานพุทธ เปิดในรัชกาลที่ 7 เมื่อวันที่ 6 เมษายน พ.ศ. 2475 เนื่องในโอกาสสมโภชกรุงรัตนโกสินทร์ 150 ปี เป็นหมุดหมายด้านการคมนาคมที่เชื่อมย่านพระนครกับฝั่งธนบุรี โครงเหล็กสีเขียวทำให้แยกจากสะพานอื่นได้ง่าย",
    historyEn:
      "Known locally as Saphan Phut, it was opened by King Rama VII on 6 April 1932 during Bangkok’s 150th-anniversary celebrations. The distinctive green steel crossing links the old city with Thonburi.",
    viewTh:
      "สะพานพาดข้ามทั้งสองฝั่ง มองด้านหน้าเมื่อเข้าใกล้และเหนือศีรษะหากเรือลอดใต้ ไม่กำหนดเป็นซ้ายหรือขวา",
    viewEn:
      "A cross-river structure: ahead on approach and overhead if the boat passes underneath, not exclusively left or right.",
    source: "https://artsandculture.google.com/asset/people-gathered-at-the-memorial-bridge-after-the-opening-ceremony/DAHNIOikrYF5eg",
    sourceLabel: "King Prajadhipok Museum / Google Arts & Culture",
    image: "/images/landmarks/guide/memorial-bridge.jpg",
    position: "50% 66%",
  },
  {
    id: "millennium-hilton",
    th: "มิลเลนเนียม ฮิลตัน กรุงเทพฯ",
    en: "Millennium Hilton Bangkok",
    bank: "west",
    eraTh: "แลนด์มาร์กโรงแรมยุคใหม่",
    eraEn: "A modern riverside hotel landmark",
    historyTh:
      "โรงแรมในย่านคลองสานบนถนนเจริญนคร สะท้อนการพัฒนาริมเจ้าพระยาจากพื้นที่ชุมชนและการค้าสู่ย่านโรงแรมและการท่องเที่ยวร่วมสมัย ตั้งอยู่ใกล้ไอคอนสยามและมีตัวอาคารสูงเป็นจุดสังเกตจากแม่น้ำ",
    historyEn:
      "A hotel on Charoen Nakhon Road in Khlong San, illustrating the riverfront’s development into a contemporary hospitality and tourism district. Its tall building stands near ICONSIAM and is recognizable from the river.",
    viewTh:
      "มองตัวอาคารสูงฝั่งคลองสาน ภาพแสดงรูปลักษณ์ภายนอก ไม่ได้หมายถึงการแวะใช้บริการโรงแรม",
    viewEn:
      "Look for the tall hotel building on the Khlong San bank. The exterior photograph does not imply a hotel visit.",
    source:
      "https://www.hilton.com/en-gb/hotels/bkkhitw-millennium-hilton-bangkok/",
    sourceLabel: "Hilton",
    image: "/images/landmarks/guide/millennium-hilton.jpg",
    position: "50% 40%",
  },
  {
    id: "iconsiam",
    th: "ไอคอนสยาม",
    en: "ICONSIAM",
    bank: "west",
    eraTh: "เปิดตัว พ.ศ. 2561",
    eraEn: "Launched in 2018",
    historyTh:
      "โครงการริมน้ำขนาดใหญ่ในย่านคลองสานที่เปิดตัวใน พ.ศ. 2561 ผสานพื้นที่การค้า ศิลปวัฒนธรรม และลานริมน้ำ เป็นตัวอย่างการเปลี่ยนบทบาทของย่านฝั่งธนบุรีสู่จุดหมายการท่องเที่ยวและกิจกรรมร่วมสมัย",
    historyEn:
      "Launched in 2018 in Khlong San, this major waterfront development combines retail, cultural spaces and a riverside plaza. It reflects the changing role of the Thonburi bank as a contemporary visitor destination.",
    viewTh:
      "ชมแนวอาคารและลานริมน้ำ การแสดงน้ำพุหรือแสงสีไม่ใช่สิ่งที่รับประกันในทุกรอบ",
    viewEn:
      "Look for the waterfront façade and plaza. Fountain or lighting shows are not guaranteed on every sailing.",
    source:
      "https://www.tatnews.org/wp-content/uploads/2018/11/Press-Release-ICONSIAM-all-set-for-one-billion-Baht-opening-extravaganza-on-9-11-November.pdf",
    sourceLabel: "ICONSIAM / TAT Newsroom",
    image: "/images/landmarks/iconsiam-twilight-hq.webp",
  },
  {
    id: "river-city",
    th: "ริเวอร์ซิตี้ แบงค็อก",
    en: "River City Bangkok",
    bank: "east",
    eraTh: "ก่อตั้ง พ.ศ. 2527",
    eraEn: "Established in 1984",
    historyTh:
      "ก่อตั้งใน พ.ศ. 2527 จากแนวคิดสร้างศูนย์รวมศิลปะและโบราณวัตถุริมแม่น้ำเจ้าพระยา ต่อมาพัฒนาเป็นพื้นที่แกลเลอรี นิทรรศการ และกิจกรรมศิลปะ เชื่อมโยงบรรยากาศย่านการค้าเก่าริมน้ำกับศิลปะร่วมสมัย",
    historyEn:
      "Established in 1984 as a riverside centre for art and antiques, River City later developed a wider programme of galleries, exhibitions and cultural events, connecting Bangkok’s historic trading waterfront with contemporary art.",
    viewTh:
      "มองอาคารริมน้ำย่านสี่พระยา ภาพนิทรรศการด้านในไม่ใช่สิ่งที่เห็นจากเรือ",
    viewEn:
      "Look for the waterfront building in Si Phraya. Indoor exhibitions are not visible from the boat.",
    source: "https://rivercitybangkok.com/th/about-us/",
    sourceLabel: "River City Bangkok",
    image: "/images/landmarks/guide/river-city.jpg",
  },
  {
    id: "asiatique",
    th: "เอเชียทีค เดอะ ริเวอร์ฟร้อนท์",
    en: "Asiatique The Riverfront",
    bank: "east",
    eraTh: "เปิดตัว พ.ศ. 2555",
    eraEn: "Launched in 2012",
    historyTh:
      "เปิดตัวใน พ.ศ. 2555 เป็นแหล่งท่องเที่ยวและไลฟ์สไตล์ริมเจ้าพระยาบนถนนเจริญกรุง ใช้บรรยากาศท่าเรือและโกดังเป็นส่วนหนึ่งของเอกลักษณ์ เชื่อมความทรงจำของย่านค้าขายริมน้ำเข้ากับกิจกรรมท่องเที่ยวยามค่ำ",
    historyEn:
      "Launched in 2012 as a waterfront tourism and lifestyle destination on Charoen Krung Road. Its dock-and-warehouse character connects the area’s trading-riverfront identity with contemporary evening leisure.",
    viewTh:
      "ชิงช้าสวรรค์และแนวริมน้ำเป็นจุดสังเกต มุมมองขึ้นอยู่กับระยะที่เรือแล่นผ่านและรอบที่เลือก",
    viewEn:
      "The observation wheel and waterfront are useful landmarks; the view depends on the sailing and the boat’s distance from shore.",
    source: "https://www.assetworldcorp-th.com/en/about/awc-heritage",
    sourceLabel: "Asset World Corporation",
    image: "/images/landmarks/guide/asiatique.jpg",
  },
  {
    id: "terminal21-rama3",
    th: "เทอร์มินอล 21 พระราม 3",
    en: "Terminal 21 Rama 3",
    bank: "east",
    eraTh: "เปิด 20 ต.ค. พ.ศ. 2565",
    eraEn: "Opened 20 October 2022",
    historyTh:
      "ศูนย์การค้าริมเจ้าพระยาในย่านพระราม 3 เปิดวันที่ 20 ตุลาคม พ.ศ. 2565 ใช้แนวคิดการเดินทางและเมืองต่างประเทศในการออกแบบ เป็นหมุดหมายร่วมสมัยทางตอนใต้ของกลุ่มสถานที่ในภาพอ้างอิง ไม่ใช่โบราณสถาน",
    historyEn:
      "Opened on 20 October 2022, this Rama 3 waterfront shopping centre uses travel and international-city themes in its design. It is a modern landmark toward the southern end of the supplied reference, rather than a historic monument.",
    viewTh:
      "จะผ่านเมื่อรอบเรือล่องมาถึงช่วงพระราม 3 เท่านั้น ภาพนี้เป็นมุมฝั่งถนนเพื่อประกอบสถานที่ ไม่ใช่มุมถ่ายจากแม่น้ำ",
    viewEn:
      "Only sailings reaching the Rama 3 section may pass here. This photograph shows the road-facing side, not the view from the river.",
    source:
      "https://www.terminal21.co.th/rama3/en/event_category/october-2022/",
    sourceLabel: "Terminal 21 Rama3",
    image: "/images/landmarks/guide/terminal21-rama3.jpg",
    position: "66% 48%",
  },
];

export function landmarkSide(bank: RiverBank, direction: RiverDirection) {
  if (bank === "crossing") return "crossing";
  return (bank === "west") === (direction === "upstream") ? "left" : "right";
}
