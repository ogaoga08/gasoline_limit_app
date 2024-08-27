<script setup>
import { request } from '../api/fetcher'

let map = null;
const routeFigures = [];
const markers = [];
const infoWindows = [];

onMounted(() => {
  map = new mapscript.Map("intern01", {
    target: "#map", // 対象のDOM要素またはセレクタを指定してください
    center: new mapscript.value.LatLng(35.68081, 139.76779), // 地図を表示する際中心となる緯度経度を指定してください
    zoomLevel: 15, // ズームレベルを指定してください
  });
});

const maxCapacity = ref(30);
const capacityRatio = ref(100);
const amountOfGasoline = computed(() => maxCapacity.value * capacityRatio.value / 100);// l
const fuelEfficiency = ref(10);// km/l
const crusingDistance = computed(() => amountOfGasoline.value * fuelEfficiency.value * 1000)// m 
const word = ref("大阪");
const spots = ref([]);
const loading = ref(false);
const gasStands = ref([]);
const infoWindowDom = ref([]);

const addInfoWindows = () => {
  infoWindows.forEach((x) => { map.removeInfoWindow(x) });
  infoWindows.length = 0;
  for (let i = 0; i < gasStands.value.length; i++) {
    // 検索結果各々に対してフキダシを定義
    const infoWindow =
      new mapscript.object.InfoWindow({
        content: infoWindowDom.value[i], // フキダシの中に表示したい内容
        position: new mapscript.value.LatLng(gasStands.value[i].coord.lat,
          gasStands.value[i].coord.lon), // フキダシを表示する緯度経度
        offset: new mapscript.value.Point(0, -40) // マーカーとフキダシが重ならないようにする
      });
    // フキダシを地図に追加
    map.addInfoWindow(infoWindow);
    // 変数markers(配列)に追加(削除で使うため)
    infoWindows.push(infoWindow);
  };
}

const searchDestination = async () => {
  if (!word.value) {
    alert("キーワードを入力してください");
    return
  }
  // ここはspot.vueと同じ
  try {
    loading.value = true;
    const data = await request('spot', {
      word: word.value,
      limit: 10,
    })
    if (!data) {
      return;
    };
    spots.value = data.items;
  } catch (e) {

    // 通信結果がエラーのときは何もしない
    error.value = e
    return
  } finally {
    loading.value = false;
  }
}
const startPoint = ref('35.667292,139.714808');
const goalPoint = ref();

const search = async (destination) => {
  spots.value = [];
  word.value = destination.name;
  goalPoint.value = `${destination.coord.lat},${destination.coord.lon}`;
  await drawRoute(startPoint.value, goalPoint.value);
  const startIconInfo = new mapscript.value.GLMarkerIconInfo({
    icon: "/images/start.svg",
  });
  addMarker(35.667292, 139.714808, startIconInfo);

  const goalIconInfo = new mapscript.value.GLMarkerIconInfo({
    icon: "/images/goal.svg",
  });
  addMarker(destination.coord.lat, destination.coord.lon, goalIconInfo);
};

const addCrusingDistanceMarkers = (sections) => {
  let totalDistance = 0;
  let beforeTotalDistance = 0;
  // 既存のマーカーを除去
  map.removeGLMarkers(markers);
  markers.length = 0;

  for (let i = 0; i < sections.length; i++) {
    if (sections[i].type == 'move') {
      beforeTotalDistance = totalDistance;
      totalDistance += sections[i].distance;
      continue;
    }

    if (beforeTotalDistance <= crusingDistance.value * 0.25 && totalDistance > crusingDistance.value * 0.25) {
      const iconInfo = new mapscript.value.GLMarkerIconInfo({
        icon: "/images/face_75.svg",
        size: new mapscript.value.Size(90, 105),
        gravity: "center"
      });
      if (crusingDistance.value * 0.25 - beforeTotalDistance > totalDistance - crusingDistance.value * 0.25) {
        addMarker(sections[i].coord.lat, sections[i].coord.lon, iconInfo);
        continue;
      }
      addMarker(sections[i - 2].coord.lat, sections[i - 2].coord.lon, iconInfo);
    }

    if (beforeTotalDistance <= crusingDistance.value * 0.5 && totalDistance > crusingDistance.value * 0.5) {
      const iconInfo = new mapscript.value.GLMarkerIconInfo({
        icon: "/images/face_50.svg",
        size: new mapscript.value.Size(90, 105),
        gravity: "center"
      });
      if (crusingDistance.value * 0.5 - beforeTotalDistance > totalDistance - crusingDistance.value * 0.5) {
        addMarker(sections[i].coord.lat, sections[i].coord.lon, iconInfo);
        continue;
      }
      addMarker(sections[i - 2].coord.lat, sections[i - 2].coord.lon, iconInfo);
    }

    if (beforeTotalDistance <= crusingDistance.value * 0.75 && totalDistance > crusingDistance.value * 0.75) {
      const iconInfo = new mapscript.value.GLMarkerIconInfo({
        icon: "/images/face_25.svg",
        size: new mapscript.value.Size(90, 105),
        gravity: "center"
      });
      if (crusingDistance.value * 0.75 - beforeTotalDistance > totalDistance - crusingDistance.value * 0.75) {
        addMarker(sections[i].coord.lat, sections[i].coord.lon, iconInfo);
        continue;
      }
      addMarker(sections[i - 2].coord.lat, sections[i - 2].coord.lon, iconInfo);
    }
    if (beforeTotalDistance <= crusingDistance.value && totalDistance > crusingDistance.value) {
      const iconInfo = new mapscript.value.GLMarkerIconInfo({
        icon: "/images/face_0.svg",
        size: new mapscript.value.Size(90, 105),
        gravity: "center"
      });
      if (crusingDistance.value - beforeTotalDistance > totalDistance - crusingDistance.value) {
        addMarker(sections[i].coord.lat, sections[i].coord.lon, iconInfo);
        continue;
      }

      addMarker(sections[i - 2].coord.lat, sections[i - 2].coord.lon, iconInfo);
    }

  }
};

const clickMarker = async (lat, lon) => {
  try {
    loading.value = true;
    const data = await request('gas_station', {
      coord: `${lat},${lon}`,
      limit: 10,
      options: "detail.opening_hours",
    })
    if (!data || data.items.length == 0) {
      alert("ガソリンスタンドが見つかりませんでした");
      return;
    };
    const iconInfo = new mapscript.value.GLMarkerIconInfo({
      icon: "/images/gas_picture.png",
    });
    const gasolinestands = [];
    for (let i = 0; i < data.items.length; i++) {
      addGasMarker(data.items[i].coord.lat, data.items[i].coord.lon, iconInfo, i);
      gasolinestands.push(new mapscript.value.LatLng(data.items[i].coord.lat, data.items[i].coord.lon));
    }
    const rect = mapscript.util.locationsToLatLngRect([
      new mapscript.value.LatLng(lat, lon),
      ...gasolinestands
    ]);
    map.moveBasedOnLatLngRect(rect, true);
    gasStands.value = data.items;
    nextTick(() => {
      addInfoWindows();
    })
  } catch (e) {
    console.log(e);
  } finally {
    loading.value = false;
  }
}
const clickGasMarker = async (lat, lon) => {
  infoWindows.forEach((infoWindow) => infoWindow.close());
  drawGasRoute(startPoint.value, goalPoint.value, JSON.stringify([{ "lat": lat, "lon": lon }]))
}

const addMarker = (lat, lon, iconInfo) => {
  // 検索結果各々に対してマーカーを定義
  const glMarker = new mapscript.object.GLMarker({
    position: new mapscript.value.LatLng(lat, lon), // 表示する緯度経度
    info: iconInfo,
  });
  glMarker.addEventListener('click', () => clickMarker(lat, lon));

  // 変数markers（配列）に追加
  markers.push(glMarker);
  map.addGLMarker(glMarker);
};

const addGasMarker = (lat, lon, iconInfo, index) => {
  // 検索結果各々に対してマーカーを定義
  const glMarker = new mapscript.object.GLMarker({
    position: new mapscript.value.LatLng(lat, lon), // 表示する緯度経度
    info: iconInfo,
  });
  glMarker.addEventListener('click', () => infoWindows[index].open());
  // 変数markers（配列）に追加
  markers.push(glMarker);
  map.addGLMarker(glMarker);
};


const drawRoute = async (start, goal) => {
  try {
    loading.value = true;
    const data = await request('route_car', {
      start: start,
      goal: goal,
      shape: true,
      options: 'turn_by_turn',
      divide_with: 'sa.pa',
    })
    // // 既存のルート線を除去
    routeFigures.forEach((x) => { map.removeGeoJsonFigure(x) });
    // // 地図にルート線を追加するときの書き方です（詳しくは地図仕様書を参照）
    const routeFigure = new mapscript.value.GeoJsonFigureCondition(data.items[0].shapes, {
      polyline: {
        inline: {
          color: new mapscript.value.Color(0.956, 0.262, 0.211, 1)
        },
        outline: {
          color: new mapscript.value.Color(1, 0.992, 0.905, 1)
        }
      }
    });
    map.addGeoJsonFigure(routeFigure);
    // // 変数routeFigures（配列）に追加（削除で使うため）
    routeFigures.push(routeFigure);
    const [lng1, lat1, lng2, lat2] = data.items[0].shapes.bbox;
    const rect = mapscript.util.locationsToLatLngRect([
      new mapscript.value.LatLng(lat1, lng1),
      new mapscript.value.LatLng(lat2, lng2)
    ]);

    map.moveBasedOnLatLngRect(rect, true);
    addCrusingDistanceMarkers(data.items[0].sections);
  } catch (error) {
    console.log(error);
    alert("エラーが発生しました");
    return;
  } finally {
    loading.value = false;
  }
};

const drawGasRoute = async (start, goal, via) => {
  try {
    loading.value = true;
    const data = await request('route_car', {
      start: start,
      goal: goal,
      via: via,
      shape: true,
      options: 'turn_by_turn',
      divide_with: 'sa.pa',
    })
    // // 既存のルート線を除去
    routeFigures.forEach((x) => { map.removeGeoJsonFigure(x) });
    // // 地図にルート線を追加するときの書き方です（詳しくは地図仕様書を参照）
    const routeFigure = new mapscript.value.GeoJsonFigureCondition(data.items[0].shapes, {
      polyline: {
        inline: {
          color: new mapscript.value.Color(0.956, 0.262, 0.211, 1)
        },
        outline: {
          color: new mapscript.value.Color(1, 0.992, 0.905, 1)
        }
      }
    });
    map.addGeoJsonFigure(routeFigure);
    // // 変数routeFigures（配列）に追加（削除で使うため）
    routeFigures.push(routeFigure);
  } catch (error) {
    console.log(error);
    alert("エラーが発生しました");
    return;
  } finally {
    loading.value = false;
  }
};

const openingHoursText = (spot) => {
  if (spot.details.length === 0) return [];
  const openingHours = spot.details[0].texts.filter((text) => {
    return text.label === "営業時間"
  })

  if (openingHours.length === 0) return [];

  return openingHours[0].value.split("＼＼");
}

</script>

<template>
  <div class="main-container">
    <header>
      <h2>ガソリミマップ</h2>
      <p>
        目的地までの経路上で、あとどれくらい航続可能かがわかる！
        <br><small>車種・ガソリン残量・燃費を入力してください</small>
      </p>
    </header>
    <div class="map-container">
      <div id="map" />
      <div class="menu-bar">

        <div class="select_wrapper">
          <select class="selecter" v-model="maxCapacity">
            <option :value="30">軽自動車</option>
            <option :value="40">普通車</option>
            <option :value="55">SUV</option>
          </select>
        </div>
        <div class="select_wrapper">
          <select class="selecter" v-model="capacityRatio">
            <option :value="100">満タン</option>
            <option :value="75">75%</option>
            <option :value="50">50%</option>
            <option :value="25">25%</option>
          </select>
        </div>
        <div class="select_wrapper">
          <select class="selecter" v-model="fuelEfficiency">
            <option :value="10">10L/km</option>
            <option :value="20">20L/km</option>
            <option :value="30">30L/km</option>
          </select>
        </div>


        <div>
          <input placeholder="目的地を入力してください" v-model="word">
          <ul class="destination-list" v-if="spots.length > 0">
            <li class="destination-list-item" v-for="spot in spots" @click="search(spot)">
              {{ spot.name }}
            </li>
          </ul>
        </div>
        <button class="search-button" @click="searchDestination">
          検索
        </button>

      </div>
    </div>
    <div class="loading" v-if="loading">
      <div class="cup"></div>
    </div>
    <div v-show="false">
      <div class="info-window" v-for="item in gasStands" ref="infoWindowDom">
        <p class="station-category">{{ item.categories[0].name }}</p>
        <small class="station-name">{{ item.name }}</small>
        <p class="station-opening-hours" v-if="openingHoursText(item).length !== 0">{{
          `営業時間：${openingHoursText(item)[0]}` }}</p>
        <small v-if="openingHoursText(item).length > 1">{{ openingHoursText(item)[1] }}</small>
        <button class="add-via-button" @click="clickGasMarker(item.coord.lat, item.coord.lon)">経由地に追加</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-container {
  width: 100vw;
  height: 100vh;
}

header {
  height: 75px;
  width: 100vw;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

h2 {
  padding: 0.5rem 1.5rem;
  color: #fff;
  border-radius: 100vh;
  background-image: -webkit-gradient(linear, right top, left top, from(#9be15d), to(#02b48b));
  background-image: -webkit-linear-gradient(right, #9be15d 0%, #02b48b 100%);
  background-image: linear-gradient(to left, #9be15d 0%, #02b48b 100%);
  width: fit-content;
  margin: 0;
  font-style: italic;
}

header p {
  font-weight: bold;
}

header small {
  font-weight: initial;
}

#map {
  width: 100vw;
  height: calc(100vh - 75px);
}

.map-container {
  position: relative;
}

.menu-bar {
  width: 100%;
  padding: 8px;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  gap: 16px;
}

.select_wrapper {
  position: relative;
}

.select_wrapper::after {
  content: "";
  position: absolute;
  top: 15px;
  right: 16px;
  width: 6px;
  height: 6px;
  border-right: 2px solid #333;
  border-bottom: 2px solid #333;
  transform: rotate(45deg);
}

.selecter {
  -webkit-appearance: none;
  appearance: none;
  border: none;
  border-radius: 100vh;
  padding: 12px 32px;
  background-color: white;
  box-shadow: 0 2px 6px 0 grey;
  font-weight: bold;
  color: #02b48b;
}

input {
  border: none;
  border-radius: 100vh;
  box-shadow: 0 2px 6px 0 grey;
  padding: 12px 16px;
  width: 350px;
}

.destination-list {
  background-color: white;
  opacity: 0.9;
  width: 350px;
  border-radius: 28px;
  box-shadow: 0 2px 6px 0 grey;
  padding: 4px 0 4px 32px;
}

.destination-list-item {
  padding: 4px;
  cursor: pointer;
}

.search-button {
  padding: 0.5rem 1.5rem;
  color: #fff;
  font-weight: bold;
  border: none;
  border-radius: 100vh;
  box-shadow: 0 2px 6px 0 grey;
  background-image: -webkit-gradient(linear, right top, left top, from(#9be15d), to(#02b48b));
  background-image: -webkit-linear-gradient(right, #9be15d 0%, #02b48b 100%);
  background-image: linear-gradient(to left, #9be15d 0%, #02b48b 100%);
  width: fit-content;
  height: fit-content;
  margin: 0;
}

.loading {
  margin: 0;
  padding: 0;
  background: #262626;
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  opacity: 0.6;
  z-index: 100;
}

.cup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 75px;
  height: 90px;
  border: 6px solid #262626;
  border-top: 2px solid transparent;
  border-radius: 15px;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  background: url(../public/images/wave.svg);
  background-position: 0px 60px;
  background-repeat: repeat-x;
  animation: filling 5s linear infinite;
  box-shadow: 0 0 0 6px #fff, 0 20px 35px rgba(0, 0, 0, 1);
}

.cup:before {
  content: '';
  position: absolute;
  width: 20px;
  height: 15px;
  border-bottom: 6px solid #fff;
  border-top: 6px solid #fff;
  left: -6px;
  top: 20px;
}

.cup:after {
  content: '';
  position: absolute;
  width: 20px;
  border-bottom: 6px solid #fff;
  left: -6px;
  top: 60px;
}

@keyframes filling {
  0% {
    background-position: 0px 60px;
  }

  50% {
    background-position: 1500px 0px;
  }

  100% {
    background-position: 3000px -60px;
  }
}

.info-window {
  padding: 8px;
}


.add-via-button {
  padding: 0.5rem 1.5rem;
  color: #fff;
  font-weight: bold;
  border: none;
  border-radius: 100vh;
  box-shadow: 0 2px 6px 0 grey;
  background-image: -webkit-gradient(linear, right top, left top, from(#9be15d), to(#02b48b));
  background-image: -webkit-linear-gradient(right, #9be15d 0%, #02b48b 100%);
  background-image: linear-gradient(to left, #9be15d 0%, #02b48b 100%);
  width: fit-content;
  height: fit-content;
  margin: 16px 0 0 0;
}

.station-category {
  font-weight: bold;
  margin: 0;
}

.station-name {
  line-height: 1;
}

.station-opening-hours {
  white-space: pre-wrap;
  margin-bottom: 0;
}
</style>

<style>
.gia-object-infowindow {
  border: none !important;
  box-shadow: 0 2px 6px 0 grey;
}

.gia-object-infowindow__tail {
  border: none !important;
  box-shadow: 0 2px 6px 0 grey;
  display: none;
}
</style>
