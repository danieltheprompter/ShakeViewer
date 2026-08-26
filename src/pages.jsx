import { Fragment, useEffect } from 'react';
import { currentLang, t } from './i18n.js';
import { SvIcon, SvLogo } from './icons.jsx';

export const TERMS_VERSION = '2026-08-26';
export const SUPPORT_EMAIL = 'danieltheprompter@gmail.com';

const AboutBodyEn = () => (
  <Fragment>
    <h3>Magnitude scale</h3>
    <p>Earthquake magnitude is logarithmic — each whole-number step represents roughly 32× more energy released.</p>
    <div style={{ margin: '8px 0 14px' }}>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#22c55e' }}>&lt; 3.5</span><span><strong>Minor</strong> — rarely felt, recorded by seismographs.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#eab308' }}>3.5–4.5</span><span><strong>Moderate</strong> — often felt, minor damage possible.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#f97316' }}>4.5–6.0</span><span><strong>Strong</strong> — can cause significant damage near the epicenter.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#ef4444' }}>6.0+</span><span><strong>Major</strong> — widespread damage, serious risk to life.</span></div>
    </div>
    <h3>Real-time monitoring</h3>
    <p>ShakeViewer aggregates data from two authoritative sources and refreshes automatically:</p>
    <ul>
      <li><strong><a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener">USGS</a></strong> — the U.S. Geological Survey, which maintains the Advanced National Seismic System.</li>
      <li><strong><a href="https://www.seismicportal.eu/" target="_blank" rel="noopener">EMSC</a></strong> — the European-Mediterranean Seismological Centre.</li>
    </ul>
    <h3>Safety tips</h3>
    <ul>
      <li><strong>If you're indoors:</strong> drop, cover, and hold on. Stay under a sturdy desk or table.</li>
      <li><strong>If you're outdoors:</strong> move to an open area away from buildings, trees, and power lines.</li>
      <li><strong>If you're driving:</strong> pull over safely, avoid overpasses and bridges, stay inside until shaking stops.</li>
      <li><strong>After the shaking stops:</strong> check yourself for injuries, be prepared for aftershocks, follow official guidance for tsunamis near coastlines.</li>
    </ul>
    <h3 id="faq">Frequently asked questions</h3>
    <details className="faq-item" open>
      <summary className="faq-q">How often is the data updated?</summary>
      <div className="faq-a">ShakeViewer refreshes earthquake data every 60 seconds in the 24-hour view and every 5 minutes for longer windows. A manual refresh button is in the header.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">Why do I see duplicate events sometimes?</summary>
      <div className="faq-a">When both USGS and EMSC report the same earthquake, ShakeViewer deduplicates them by time and location. In rare cases a report may arrive too late for the merge.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">What do the depth categories mean?</summary>
      <div className="faq-a">Shallow earthquakes (&lt;70 km deep) cause the most surface damage. Intermediate (70–300 km) and deep (&gt;300 km) earthquakes dissipate more energy before reaching the surface.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">Where do most earthquakes happen?</summary>
      <div className="faq-a">Along tectonic plate boundaries, especially the Pacific Ring of Fire. Toggle the plate-boundaries overlay in Filters to see this pattern.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">Can I search historical earthquakes?</summary>
      <div className="faq-a">Yes — switch to Custom in the time range selector, pick a date range and minimum magnitude, optionally draw a boundary on the map, and run the search.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">Why should I create an account?</summary>
      <div className="faq-a">Accounts let you bookmark earthquakes and sync saved searches across devices. Theme, language, and map style stay on this device (they are not synced).</div>
    </details>
  </Fragment>
);

const AboutBodyEs = () => (
  <Fragment>
    <h3>Escala de magnitud</h3>
    <p>La magnitud de un terremoto es logarítmica: cada paso de un número entero representa aproximadamente 32 veces más energía liberada.</p>
    <div style={{ margin: '8px 0 14px' }}>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#22c55e' }}>&lt; 3,5</span><span><strong>Menor</strong> — rara vez se siente; lo registran los sismógrafos.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#eab308' }}>3,5–4,5</span><span><strong>Moderado</strong> — suele sentirse; posibles daños leves.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#f97316' }}>4,5–6,0</span><span><strong>Fuerte</strong> — puede causar daños significativos cerca del epicentro.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#ef4444' }}>6,0+</span><span><strong>Mayor</strong> — daños generalizados; riesgo grave para la vida.</span></div>
    </div>
    <h3>Monitoreo en tiempo real</h3>
    <p>ShakeViewer agrega datos de dos fuentes oficiales y los actualiza automáticamente:</p>
    <ul>
      <li><strong><a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener">USGS</a></strong> — el Servicio Geológico de los Estados Unidos, que opera el Advanced National Seismic System.</li>
      <li><strong><a href="https://www.seismicportal.eu/" target="_blank" rel="noopener">EMSC</a></strong> — el Centro Sismológico Euromediterráneo.</li>
    </ul>
    <h3>Consejos de seguridad</h3>
    <ul>
      <li><strong>Si estás en interiores:</strong> agáchate, cúbrete y sujétate. Permanece bajo un escritorio o mesa resistentes.</li>
      <li><strong>Si estás al aire libre:</strong> dirígete a un espacio abierto, lejos de edificios, árboles y cables eléctricos.</li>
      <li><strong>Si vas conduciendo:</strong> detente con seguridad, evita pasos elevados y puentes, y permanece en el vehículo hasta que cese el temblor.</li>
      <li><strong>Cuando cese el temblor:</strong> revísate en busca de heridas, prepárate para réplicas y, si te encuentras cerca de la costa, sigue las indicaciones oficiales sobre tsunamis.</li>
    </ul>
    <h3 id="faq">Preguntas frecuentes</h3>
    <details className="faq-item" open>
      <summary className="faq-q">¿Con qué frecuencia se actualizan los datos?</summary>
      <div className="faq-a">ShakeViewer actualiza la información sísmica cada 60 segundos en la vista de 24 horas y cada 5 minutos en intervalos más amplios. En el encabezado encontrarás un botón de actualización manual.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">¿Por qué a veces aparecen eventos duplicados?</summary>
      <div className="faq-a">Cuando USGS y EMSC reportan el mismo sismo, ShakeViewer los deduplica por hora y ubicación. En casos excepcionales, un reporte puede llegar demasiado tarde para la fusión.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">¿Qué significan las categorías de profundidad?</summary>
      <div className="faq-a">Los terremotos superficiales (&lt;70 km) causan los mayores daños en superficie. Los intermedios (70–300 km) y los profundos (&gt;300 km) disipan más energía antes de llegar a la superficie.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">¿Dónde ocurren la mayoría de los terremotos?</summary>
      <div className="faq-a">A lo largo de los límites de las placas tectónicas, especialmente en el Cinturón de Fuego del Pacífico. Activa la capa de límites tectónicos en los filtros para visualizar este patrón.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">¿Puedo buscar terremotos históricos?</summary>
      <div className="faq-a">Sí. Cambia a la opción Personalizado en el selector de rango temporal, elige un intervalo de fechas y una magnitud mínima, opcionalmente dibuja un área en el mapa y ejecuta la búsqueda.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">¿Por qué debería crear una cuenta?</summary>
      <div className="faq-a">Las cuentas te permiten guardar terremotos en marcadores y sincronizar las búsquedas guardadas entre dispositivos. El tema, el idioma y el estilo del mapa se quedan en este dispositivo (no se sincronizan).</div>
    </details>
  </Fragment>
);

const AboutBodyPt = () => (
  <Fragment>
    <h3>Escala de magnitude</h3>
    <p>A magnitude de um terremoto é logarítmica — cada passo de um número inteiro representa aproximadamente 32 vezes mais energia liberada.</p>
    <div style={{ margin: '8px 0 14px' }}>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#22c55e' }}>&lt; 3,5</span><span><strong>Pequeno</strong> — raramente sentido; registrado por sismógrafos.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#eab308' }}>3,5–4,5</span><span><strong>Moderado</strong> — frequentemente sentido; possíveis danos leves.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#f97316' }}>4,5–6,0</span><span><strong>Forte</strong> — pode causar danos significativos próximo ao epicentro.</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#ef4444' }}>6,0+</span><span><strong>Grande</strong> — danos generalizados; grave risco à vida.</span></div>
    </div>
    <h3>Monitoramento em tempo real</h3>
    <p>O ShakeViewer agrega dados de duas fontes oficiais e os atualiza automaticamente:</p>
    <ul>
      <li><strong><a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener">USGS</a></strong> — o Serviço Geológico dos Estados Unidos, responsável pelo Advanced National Seismic System.</li>
      <li><strong><a href="https://www.seismicportal.eu/" target="_blank" rel="noopener">EMSC</a></strong> — o Centro Sismológico Euro-Mediterrâneo.</li>
    </ul>
    <h3>Dicas de segurança</h3>
    <ul>
      <li><strong>Se você estiver em um ambiente fechado:</strong> abaixe-se, proteja-se e segure firme. Permaneça sob uma mesa ou escrivaninha resistente.</li>
      <li><strong>Se você estiver ao ar livre:</strong> dirija-se a um espaço aberto, longe de edifícios, árvores e fiação elétrica.</li>
      <li><strong>Se você estiver dirigindo:</strong> pare em local seguro, evite viadutos e pontes e permaneça dentro do veículo até o tremor cessar.</li>
      <li><strong>Depois que o tremor cessar:</strong> verifique se há ferimentos, esteja preparado para tremores secundários e, se estiver próximo ao litoral, siga as orientações oficiais sobre tsunamis.</li>
    </ul>
    <h3 id="faq">Perguntas frequentes</h3>
    <details className="faq-item" open>
      <summary className="faq-q">Com que frequência os dados são atualizados?</summary>
      <div className="faq-a">O ShakeViewer atualiza os dados sísmicos a cada 60 segundos na visualização de 24 horas e a cada 5 minutos em janelas maiores. Há um botão de atualização manual no cabeçalho.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">Por que às vezes aparecem eventos duplicados?</summary>
      <div className="faq-a">Quando USGS e EMSC reportam o mesmo terremoto, o ShakeViewer remove duplicidades por horário e localização. Em casos raros, um relatório pode chegar tarde demais para a mesclagem.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">O que significam as categorias de profundidade?</summary>
      <div className="faq-a">Terremotos rasos (&lt;70 km) causam os maiores danos na superfície. Os intermediários (70–300 km) e os profundos (&gt;300 km) dissipam mais energia antes de chegar à superfície.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">Onde ocorre a maioria dos terremotos?</summary>
      <div className="faq-a">Ao longo dos limites das placas tectônicas, especialmente no Anel de Fogo do Pacífico. Ative a camada de limites de placas nos filtros para visualizar esse padrão.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">Posso pesquisar terremotos históricos?</summary>
      <div className="faq-a">Sim. Alterne para Personalizado no seletor de intervalo de tempo, escolha um período e uma magnitude mínima, opcionalmente desenhe uma área no mapa e execute a busca.</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">Por que devo criar uma conta?</summary>
      <div className="faq-a">As contas permitem marcar terremotos como favoritos e sincronizar buscas salvas entre dispositivos. Tema, idioma e estilo do mapa ficam neste dispositivo (não são sincronizados).</div>
    </details>
  </Fragment>
);

const AboutBodyJa = () => (
  <Fragment>
    <h3>マグニチュードの目安</h3>
    <p>地震のマグニチュードは対数で表され、整数1段階の上昇はおおよそ32倍のエネルギー放出に相当します。</p>
    <div style={{ margin: '8px 0 14px' }}>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#22c55e' }}>&lt; 3.5</span><span><strong>軽微</strong> — 体感されることはまれで、地震計に記録される程度です。</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#eab308' }}>3.5–4.5</span><span><strong>中程度</strong> — しばしば体感され、軽微な被害が生じることがあります。</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#f97316' }}>4.5–6.0</span><span><strong>強い</strong> — 震源付近では大きな被害を引き起こすおそれがあります。</span></div>
      <div className="mag-row"><span className="mag-pill" style={{ background: '#ef4444' }}>6.0+</span><span><strong>大規模</strong> — 広範囲に被害が及び、人命に重大な危険を伴います。</span></div>
    </div>
    <h3>リアルタイム観測</h3>
    <p>ShakeViewerは、2つの公的な情報源からデータを集約し、自動的に更新します。</p>
    <ul>
      <li><strong><a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener">USGS</a></strong> — 米国地質調査所。Advanced National Seismic Systemを運営しています。</li>
      <li><strong><a href="https://www.seismicportal.eu/" target="_blank" rel="noopener">EMSC</a></strong> — 欧州地中海地震センター。</li>
    </ul>
    <h3>安全のためのヒント</h3>
    <ul>
      <li><strong>屋内にいる場合：</strong>姿勢を低くし、頭を守り、動かないようにしてください。頑丈な机やテーブルの下に入りましょう。</li>
      <li><strong>屋外にいる場合：</strong>建物・樹木・電線から離れた開けた場所へ移動してください。</li>
      <li><strong>運転中の場合：</strong>安全な場所に停車し、高架橋や橋を避け、揺れが収まるまで車内にとどまってください。</li>
      <li><strong>揺れが収まったら：</strong>けがの有無を確認し、余震に備え、沿岸部にいる場合は津波に関する公的な情報に従ってください。</li>
    </ul>
    <h3 id="faq">よくあるご質問</h3>
    <details className="faq-item" open>
      <summary className="faq-q">データはどのくらいの頻度で更新されますか？</summary>
      <div className="faq-a">ShakeViewerは、24時間表示では60秒ごと、それより長い期間では5分ごとに地震データを更新します。ヘッダーには手動更新ボタンもあります。</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">同じ地震が重複して表示されることがあるのはなぜですか？</summary>
      <div className="faq-a">USGSとEMSCの双方が同じ地震を報告した場合、ShakeViewerは発生時刻と場所をもとに重複を統合します。まれに、報告の到着が遅れて統合が間に合わないことがあります。</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">深さの区分は何を意味しますか？</summary>
      <div className="faq-a">浅い地震（深さ70 km未満）は、地表に最も大きな被害をもたらします。中深度（70〜300 km）および深発（300 km超）の地震は、地表に到達するまでにより多くのエネルギーを失います。</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">地震が最も多く発生するのはどこですか？</summary>
      <div className="faq-a">プレート境界付近、特に環太平洋火山帯（リング・オブ・ファイア）です。フィルターでプレート境界レイヤーを表示すると、この傾向を確認できます。</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">過去の地震を検索できますか？</summary>
      <div className="faq-a">はい。期間セレクターでカスタムに切り替え、日付の範囲と最小マグニチュードを指定し、必要に応じて地図上に範囲を描画してから検索を実行してください。</div>
    </details>
    <details className="faq-item">
      <summary className="faq-q">アカウントを作成すると何ができますか？</summary>
      <div className="faq-a">アカウントを作成すると、地震をブックマークに保存でき、保存済みの検索条件を複数のデバイス間で同期できます。テーマ・言語・地図スタイルはこの端末にのみ保存され、同期されません。</div>
    </details>
  </Fragment>
);

const AboutBody = () => {
  const bodies = { en: <AboutBodyEn/>, es: <AboutBodyEs/>, pt: <AboutBodyPt/>, ja: <AboutBodyJa/> };
  return bodies[currentLang] || bodies.en;
};

const PrivacyBodyEn = () => (
  <Fragment>
    <h3>Overview</h3>
    <p>ShakeViewer respects your privacy. This policy explains what data we collect, how it is used, and your rights.</p>
    <h3>Data we collect</h3>
    <ul>
      <li><strong>Earthquake data</strong> is fetched directly from USGS and EMSC — no personally identifying information is sent to them beyond your IP address.</li>
      <li><strong>Account data</strong> (if you sign in): email, display name, optional profile photo, and a hashed password (or Google identity).</li>
      <li><strong>User content</strong>: bookmarks and saved searches you choose to sync to the cloud. Theme, language, and map style stay in your browser.</li>
      <li><strong>Location</strong> (optional): if you use the Near Me feature, your approximate coordinates are read from your browser and stored only on your device.</li>
    </ul>
    <h3>How data is used</h3>
    <p>Your account data and user content are stored in Firebase (Google Cloud) and used solely to provide ShakeViewer features. We do not sell, rent, or share your data with advertisers.</p>
    <h3>Analytics</h3>
    <p>ShakeViewer does not load Google Analytics. The site is hosted on Netlify, which may collect basic visit metrics (Netlify Real User Monitoring) at the hosting layer. Display preferences (theme, language, map style) are stored only in your browser.</p>
    <h3>Your rights</h3>
    <p>You may delete your account at any time from the Profile page — this erases your bookmarks, search history, and user record from our systems.</p>
    <h3>Contact</h3>
    <p>Questions? Email <a href="mailto:danieltheprompter@gmail.com">danieltheprompter@gmail.com</a>.</p>
  </Fragment>
);

const PrivacyBodyEs = () => (
  <Fragment>
    <h3>Información general</h3>
    <p>ShakeViewer respeta su privacidad. La presente política describe qué datos se recopilan, cómo se utilizan y cuáles son sus derechos.</p>
    <h3>Datos que se recopilan</h3>
    <ul>
      <li><strong>Datos sísmicos</strong>: se obtienen directamente de USGS y EMSC; no se les remite ninguna información personal identificable, salvo su dirección IP.</li>
      <li><strong>Datos de cuenta</strong> (si inicia sesión): correo electrónico, nombre visible, fotografía de perfil opcional y una contraseña con hash (o identidad de Google).</li>
      <li><strong>Contenido del usuario</strong>: marcadores y búsquedas guardadas que el usuario decida sincronizar en la nube. El tema, el idioma y el estilo del mapa se quedan en el navegador.</li>
      <li><strong>Ubicación</strong> (opcional): si utiliza la función «Cerca de mí», sus coordenadas aproximadas se obtienen del navegador y se almacenan únicamente en su dispositivo.</li>
    </ul>
    <h3>Uso de los datos</h3>
    <p>Los datos de cuenta y el contenido del usuario se almacenan en Firebase (Google Cloud) y se utilizan exclusivamente para proporcionar las funciones de ShakeViewer. Los datos no se venden, alquilan ni comparten con anunciantes.</p>
    <h3>Analítica</h3>
    <p>ShakeViewer no carga Google Analytics. El sitio está alojado en Netlify, que puede recopilar métricas básicas de visita (Netlify Real User Monitoring) en la capa de alojamiento. Las preferencias de visualización (tema, idioma, estilo de mapa) se guardan solo en su navegador.</p>
    <h3>Sus derechos</h3>
    <p>El usuario puede eliminar su cuenta en cualquier momento desde la página de Perfil; esta acción borra sus marcadores, su historial de búsquedas y su registro de usuario de nuestros sistemas.</p>
    <h3>Contacto</h3>
    <p>¿Tiene alguna consulta? Escriba a <a href="mailto:danieltheprompter@gmail.com">danieltheprompter@gmail.com</a>.</p>
  </Fragment>
);

const PrivacyBodyPt = () => (
  <Fragment>
    <h3>Visão geral</h3>
    <p>O ShakeViewer respeita a sua privacidade. Esta política descreve quais dados são coletados, como são utilizados e quais são os seus direitos.</p>
    <h3>Dados coletados</h3>
    <ul>
      <li><strong>Dados sísmicos</strong>: são obtidos diretamente do USGS e do EMSC; nenhuma informação pessoal identificável é enviada a essas entidades além do seu endereço IP.</li>
      <li><strong>Dados da conta</strong> (caso você faça login): e-mail, nome de exibição, foto de perfil opcional e senha criptografada com hash (ou identidade do Google).</li>
      <li><strong>Conteúdo do usuário</strong>: favoritos e buscas salvas que você optar por sincronizar na nuvem. Tema, idioma e estilo do mapa ficam apenas no navegador.</li>
      <li><strong>Localização</strong> (opcional): se utilizar o recurso «Perto de mim», suas coordenadas aproximadas são lidas do navegador e armazenadas apenas no seu dispositivo.</li>
    </ul>
    <h3>Como os dados são utilizados</h3>
    <p>Os dados da conta e o conteúdo do usuário são armazenados no Firebase (Google Cloud) e utilizados exclusivamente para fornecer os recursos do ShakeViewer. Seus dados não são vendidos, alugados nem compartilhados com anunciantes.</p>
    <h3>Análise de uso</h3>
    <p>O ShakeViewer não carrega o Google Analytics. O site é hospedado na Netlify, que pode coletar métricas básicas de visita (Netlify Real User Monitoring) na camada de hospedagem. Preferências de exibição (tema, idioma, estilo do mapa) ficam apenas no seu navegador.</p>
    <h3>Seus direitos</h3>
    <p>Você pode excluir sua conta a qualquer momento na página Perfil — essa ação apaga seus favoritos, seu histórico de buscas e seu registro de usuário dos nossos sistemas.</p>
    <h3>Contato</h3>
    <p>Dúvidas? Escreva para <a href="mailto:danieltheprompter@gmail.com">danieltheprompter@gmail.com</a>.</p>
  </Fragment>
);

const PrivacyBodyJa = () => (
  <Fragment>
    <h3>概要</h3>
    <p>ShakeViewerはお客様のプライバシーを尊重します。本ポリシーは、当社が収集するデータの種類、その利用方法、およびお客様の権利について説明するものです。</p>
    <h3>収集するデータ</h3>
    <ul>
      <li><strong>地震データ</strong>は、USGSおよびEMSCから直接取得します。お客様のIPアドレスを除き、個人を特定できる情報がこれらの提供元へ送信されることはありません。</li>
      <li><strong>アカウント情報</strong>（サインインした場合）：メールアドレス、表示名、任意のプロフィール画像、ならびにハッシュ化されたパスワード（またはGoogleの認証情報）。</li>
      <li><strong>ユーザーコンテンツ</strong>：クラウドへの同期を選択したブックマークおよび保存済みの検索条件。テーマ・言語・地図スタイルはこの端末のブラウザにのみ保存されます。</li>
      <li><strong>位置情報</strong>（任意）：「現在地付近」機能を使用する場合、おおよその座標がブラウザから読み取られ、お客様のデバイス内にのみ保存されます。</li>
    </ul>
    <h3>データの利用方法</h3>
    <p>アカウント情報およびユーザーコンテンツは、Firebase（Google Cloud）に保存され、ShakeViewerの機能を提供する目的にのみ利用されます。お客様のデータを広告主に販売、貸与、または共有することはありません。</p>
    <h3>アクセス解析</h3>
    <p>ShakeViewerはGoogle Analyticsを読み込みません。本サイトはNetlify上でホストされており、ホスティング層で基本的な訪問指標（Netlify Real User Monitoring）が収集される場合があります。表示設定（テーマ・言語・地図スタイル）はこの端末のブラウザにのみ保存されます。</p>
    <h3>お客様の権利</h3>
    <p>お客様は、プロフィールページからいつでもアカウントを削除できます。削除を行うと、ブックマーク、検索履歴、およびユーザーレコードが当社のシステムから消去されます。</p>
    <h3>お問い合わせ</h3>
    <p>ご質問は <a href="mailto:danieltheprompter@gmail.com">danieltheprompter@gmail.com</a> までご連絡ください。</p>
  </Fragment>
);

const PrivacyBody = () => {
  const bodies = { en: <PrivacyBodyEn/>, es: <PrivacyBodyEs/>, pt: <PrivacyBodyPt/>, ja: <PrivacyBodyJa/> };
  return bodies[currentLang] || bodies.en;
};

const TermsBodyEn = () => (
  <Fragment>
    <h3>Acceptance</h3>
    <p>By using ShakeViewer you agree to these terms. If you do not accept them, please do not use the service.</p>
    <h3>Nature of the service</h3>
    <p>ShakeViewer provides earthquake information aggregated from USGS and EMSC for informational and educational purposes only. Data may be delayed, incomplete, or inaccurate. <strong>Do not rely on ShakeViewer for life-safety decisions.</strong> Follow official emergency alerts and local authorities.</p>
    <h3>Acceptable use</h3>
    <ul>
      <li>Do not attempt to reverse-engineer, scrape in bulk, or overload the service.</li>
      <li>Do not use ShakeViewer to mislead or spread disinformation about seismic events.</li>
      <li>Respect the terms of upstream data providers (USGS and EMSC).</li>
    </ul>
    <h3>Accounts</h3>
    <p>You are responsible for your account credentials and any activity performed through your account. You may delete your account at any time from the Profile page.</p>
    <h3>Disclaimer</h3>
    <p>The service is provided "as is" without warranty of any kind. ShakeViewer is not liable for damages arising from use of the service or reliance on the data it displays.</p>
    <h3>Changes</h3>
    <p>These terms may change. The effective date above indicates when they were last updated. Continued use of the service constitutes acceptance of the updated terms.</p>
  </Fragment>
);

const TermsBodyEs = () => (
  <Fragment>
    <h3>Aceptación</h3>
    <p>Mediante el uso de ShakeViewer, el usuario acepta los presentes términos. Si no los acepta, le rogamos que se abstenga de utilizar el servicio.</p>
    <h3>Naturaleza del servicio</h3>
    <p>ShakeViewer proporciona información sobre terremotos procedente de USGS y EMSC con fines exclusivamente informativos y educativos. Los datos pueden presentar retrasos, ser incompletos o contener inexactitudes. <strong>No utilice ShakeViewer como base para decisiones relativas a la seguridad de la vida.</strong> Siga siempre las alertas oficiales de emergencia y las indicaciones de las autoridades locales.</p>
    <h3>Uso aceptable</h3>
    <ul>
      <li>No intente realizar ingeniería inversa, extraer datos de forma masiva ni sobrecargar el servicio.</li>
      <li>No utilice ShakeViewer para inducir a error o difundir desinformación sobre eventos sísmicos.</li>
      <li>Respete los términos de los proveedores de datos de origen (USGS y EMSC).</li>
    </ul>
    <h3>Cuentas</h3>
    <p>El usuario es responsable de las credenciales de su cuenta y de cualquier actividad realizada a través de ella. El usuario podrá eliminar su cuenta en cualquier momento desde la página de Perfil.</p>
    <h3>Exención de responsabilidad</h3>
    <p>El servicio se proporciona «tal cual», sin garantía de ningún tipo. ShakeViewer no será responsable de los daños derivados del uso del servicio o de la confianza depositada en los datos que muestra.</p>
    <h3>Modificaciones</h3>
    <p>Los presentes términos podrán modificarse. La fecha de vigencia indicada arriba señala cuándo se actualizaron por última vez. El uso continuado del servicio constituye la aceptación de los términos modificados.</p>
  </Fragment>
);

const TermsBodyPt = () => (
  <Fragment>
    <h3>Aceitação</h3>
    <p>Ao utilizar o ShakeViewer, o usuário concorda com estes termos. Caso não os aceite, por favor não utilize o serviço.</p>
    <h3>Natureza do serviço</h3>
    <p>O ShakeViewer disponibiliza informações sobre terremotos agregadas a partir do USGS e do EMSC, com finalidade exclusivamente informativa e educacional. Os dados podem estar atrasados, incompletos ou imprecisos. <strong>Não utilize o ShakeViewer como base para decisões relativas à segurança da vida.</strong> Siga sempre os alertas oficiais de emergência e as orientações das autoridades locais.</p>
    <h3>Uso aceitável</h3>
    <ul>
      <li>Não tente realizar engenharia reversa, coletar dados em massa nem sobrecarregar o serviço.</li>
      <li>Não utilize o ShakeViewer para induzir terceiros a erro ou divulgar desinformação sobre eventos sísmicos.</li>
      <li>Respeite os termos dos provedores de dados de origem (USGS e EMSC).</li>
    </ul>
    <h3>Contas</h3>
    <p>O usuário é responsável pelas credenciais da sua conta e por qualquer atividade realizada por meio dela. O usuário poderá excluir sua conta a qualquer momento na página Perfil.</p>
    <h3>Isenção de responsabilidade</h3>
    <p>O serviço é fornecido "no estado em que se encontra", sem garantia de qualquer espécie. O ShakeViewer não se responsabiliza por danos decorrentes do uso do serviço ou da confiança depositada nos dados exibidos.</p>
    <h3>Alterações</h3>
    <p>Estes termos poderão ser alterados. A data de vigência indicada acima informa quando foram atualizados pela última vez. O uso continuado do serviço constitui aceitação dos termos alterados.</p>
  </Fragment>
);

const TermsBodyJa = () => (
  <Fragment>
    <h3>同意</h3>
    <p>ShakeViewerをご利用いただくことにより、お客様は本規約に同意したものとみなされます。本規約に同意されない場合は、本サービスをご利用にならないでください。</p>
    <h3>本サービスの内容</h3>
    <p>ShakeViewerは、USGSおよびEMSCから集約した地震情報を、情報提供および教育を目的として提供するものです。データには遅延、欠落、または誤りが含まれる場合があります。<strong>ShakeViewerを人命に関わる判断の根拠として使用しないでください。</strong>公的な緊急警報および各地域の当局の指示に従ってください。</p>
    <h3>禁止事項</h3>
    <ul>
      <li>本サービスに対するリバースエンジニアリング、大量のスクレイピング、または過度な負荷を与える行為を行わないでください。</li>
      <li>地震に関する誤解を招く情報や虚偽情報の発信を目的としてShakeViewerを利用しないでください。</li>
      <li>上流のデータ提供元（USGSおよびEMSC）の規約を遵守してください。</li>
    </ul>
    <h3>アカウント</h3>
    <p>お客様は、ご自身のアカウントの認証情報、およびそのアカウントを通じて行われる一切の行為について責任を負うものとします。アカウントはプロフィールページからいつでも削除できます。</p>
    <h3>免責事項</h3>
    <p>本サービスは「現状有姿」で提供されるものであり、いかなる種類の保証も行いません。ShakeViewerは、本サービスの利用または表示されるデータへの依拠から生じるいかなる損害についても責任を負わないものとします。</p>
    <h3>変更</h3>
    <p>本規約は変更されることがあります。上記の発効日は、本規約が最後に更新された日付を示しています。本サービスの継続的な利用は、変更後の規約に同意したものとみなされます。</p>
  </Fragment>
);

const TermsBody = () => {
  const bodies = { en: <TermsBodyEn/>, es: <TermsBodyEs/>, pt: <TermsBodyPt/>, ja: <TermsBodyJa/> };
  return bodies[currentLang] || bodies.en;
};


export function DocumentPage({ title, children, onBack, hash }) {
  useEffect(() => {
    if (hash) {
      const id = String(hash).replace('#', '');
      setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50);
    }
  }, [hash]);
  return (
    <div className="doc-app">
      <header className="sv-header desktop">
        <div className="sv-brand">
          <SvLogo size={22} />
          <span className="sv-h1" style={{ fontSize: 18 }}>ShakeViewer</span>
        </div>
        <div className="sv-header-right">
          <button type="button" className="sv-btn ghost" onClick={onBack}>
            <SvIcon name="chevron-left" size={14} /> {t('back_to_map')}
          </button>
        </div>
      </header>
      <main id="main-content" className="doc-main prose" tabIndex={-1}>
        <h1 className="display" style={{ fontSize: 32, margin: '0 0 8px' }}>{title}</h1>
        <p style={{ fontSize: 12, color: 'var(--fg-2)' }}>Effective {TERMS_VERSION}</p>
        {children}
      </main>
    </div>
  );
}

export { AboutBody, PrivacyBody, TermsBody };
