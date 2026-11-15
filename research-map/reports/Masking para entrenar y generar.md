# Masking para entrenar y generar

Búsqueda del 2026-11-15 con la skill `paper-research` (4 scouts en haiku, 4 validadores en sonnet). Las notas con cada
tarjeta están en `research_notes/Masking para entrenar y generar/`. Las cifras son las que los validadores leyeron en
los PDFs; se leyeron resumen y pasajes, no los artículos completos, así que hay que confirmarlas en el PDF antes de
citarlas. Lo marcado *(inferencia)* es lectura propia, no afirmación de los autores.

Contexto que ya estaba en la biblioteca y no se repite: Han et al. (BIGNet), Liang et al. (Building-Graph-AI), Hornung
et al. y Fuchs y Borrmann.

## Qué ocultar y con qué modelo

**La fracción que conviene ocultar depende de cuánto se repite el grafo.** GraphMAE oculta atributos de nodo y los
reconstruye con un decodificador GNN; ocultar 10% es demasiado fácil, en Cora el mejor valor es 0.5 y en PubMed y
MUTAG sigue funcionando con 0.7 a 0.9 ([Hou et al. 2022](https://arxiv.org/pdf/2205.10803), Fig. 3). MaskGAE oculta
aristas y caminos en vez de atributos, y su mejor proporción ronda 0.7 ([Li et al. 2023](https://arxiv.org/pdf/2205.10053)).

**En arquitectura el óptimo sale más bajo.** GTGAN++ oculta nodos y aristas juntos en grafos de cuartos para generar
plantas de casas; probó de 10% a 90% y el mejor fue 40%, porque arriba de eso el grafo restante dice muy poco
([Tang et al. 2024](https://arxiv.org/pdf/2401.07721), Fig. 13). *(Inferencia:)* un grafo de Revit con muchos muros y
puertas repetidos podría tolerar más que un grafo de cuartos; es algo que la tesis puede medir.

**Los grafos con tipos tienen su propia receta.** HGMAE oculta aristas siguiendo metacaminos (secuencias de tipos de
relación) y atributos con una proporción que sube de 0.5 a 0.8 durante el entrenamiento
([Tian et al. 2023](https://arxiv.org/pdf/2208.09957)). Es lo más parecido a elementos de Revit con relaciones tipadas
(anfitrión, contiene, colinda).

**El masking también sirve para generar, no solo para preentrenar.** El modelo de grafos enmascarados de Mahmood et
al. genera moléculas ocultando y rellenando partes por turnos, y la proporción oculta al generar (10% o 20% en QM9, 1% o 5% en ChEMBL)
intercambia validez por novedad ([Mahmood et al. 2021](https://www.nature.com/articles/s41467-021-23415-2.pdf)). Es
justo el par "nuevo, válido" de la pregunta.

## Orden de colocación

**El orden cambia el resultado, y casi nadie lo había comparado.** Bu et al. comparan orden aleatorio, BFS, DFS y uno
aprendido para generar grafos uno por uno, y afirman que no había comparación previa
([Bu et al. 2023](https://arxiv.org/pdf/2305.15562), preprint). Chen et al. tratan el orden como variable oculta en
vez de fijarlo, y muestran el sesgo que BFS mete en los grafos generados ([Chen et al. 2021](https://arxiv.org/pdf/2106.06189), ICML).

**En escenas de interior, ir por vecinos gana.** Forest2Seq agrupa los objetos en árboles y los recorre a lo ancho (BFS)
para un transformer que coloca uno por uno; su ablación compara orden aleatorio, fijo, árbol con BFS, bosque con DFS y
bosque con BFS en 3D-FRONT, y BFS supera a DFS ([Sun et al. 2024](https://arxiv.org/pdf/2407.05388), Tabla 4). Es el
análogo más cercano a "uno y luego sus colindantes".

**"Todo junto y luego refinar" viene de MaskGIT.** Predice todos los elementos ocultos a la vez y los corrige en 8 pasos,
contra 256 pasos en orden fijo ([Chang et al. 2022](https://arxiv.org/pdf/2202.04200)). El Halton scheduler muestra que
importa qué posiciones se destapan en cada paso, y que conviene destapar juntas las que están poco relacionadas
([Besnier et al. 2025](https://arxiv.org/pdf/2503.17076)). Ambos son de imágenes.

**Hueco:** nadie compara en un mismo problema de plantas o de elementos de edificio los tres órdenes de la tesis
(MaskLayout compara dos, ver abajo). Los
experimentos de `placement-order-experiments` serían la primera comparación de ese tipo que encontró esta búsqueda.

## Nuevo o copiado

**Hay pruebas concretas, pero ninguna para grafos de edificio.** La prueba de copia de datos de Meehan et al. usa tres
conjuntos, entrenamiento, uno retenido y lo generado, y pregunta si lo generado queda más cerca del entrenamiento que
lo retenido ([Meehan et al. 2020](https://arxiv.org/pdf/2004.05675), AISTATS). Encaja con el plan de entrenar con 9
modelos y probar con el décimo, que hace de conjunto retenido *(inferencia)*.

**Con pocos datos se copia más.** En difusión, la réplica es frecuente con 300 y 3,000 imágenes de entrenamiento y no
se detecta con ImageNet completo ([Somepalli et al. 2023](https://arxiv.org/pdf/2212.03860)). Con 9 modelos la tesis
está del lado de pocos datos *(inferencia)*.

**La definición más usada de novedad es simple y se queda corta.** MOSES llama novedad a la fracción de lo generado que
no está en el entrenamiento, y advierte que una novedad baja indica sobreajuste; cuenta solo coincidencias exactas
([Polykovskiy et al. 2020](https://www.frontiersin.org/articles/10.3389/fphar.2020.565644/pdf)). Un preprint reciente
advierte que los umbrales de similitud no tienen distribución nula y propone una prueba de permutación; según su
resumen, la prueba de Meehan marca 10 de 24 generadores que no reproducen nada
([Majhi y Bagchi 2026](https://arxiv.org/pdf/2610.00251), sin revisión por pares).

**Hueco:** no se encontró una prueba de copia hecha para grafos (distancia de edición o kernel al grafo de
entrenamiento más cercano) ni una que mida "nuevo y válido" juntos. Adaptar Meehan o MOSES a grafos de Revit es diseño
propio.

## Quién ya oculta datos de edificios

Fuera de los cuatro que ya están en la biblioteca, la búsqueda encontró poco con PDF abierto comprobado. SceneNAT
entrena con masking sobre atributos y objetos completos de escenas de interior, pero son muebles, no BIM
([Choi et al. 2026](https://arxiv.org/pdf/2601.07218), preprint).

**El hallazgo más cercano es MaskLayout** (Zhang, Savov y Dillenburger, ETH,
[Automation in Construction 2026](https://doi.org/10.1016/j.autcon.2026.107120), CC BY; el autor bajó el PDF del
[ETH Research Collection](https://www.research-collection.ethz.ch/handle/20.500.11850/802682) el 2026-11-15, porque
ningún script pudo). Genera plantas de departamento de hasta 14 cuartos dentro de bordes irregulares, sobre más de
43,000 departamentos de SwissDwellings. Oculta en dos niveles, un cuarto completo o un solo atributo de un cuarto, con
una proporción que cambia según un calendario gaussiano, porque una fija no sirve cuando la entrada varía.

**Y responde en parte la pregunta del orden.** En su ablación, con el mismo modelo y los mismos datos, decodificar todo
a la vez con refinamiento por pasos da FID 4.02, un transformer autorregresivo (uno por uno) 4.84, y elegir las
posiciones de forma pareja por confianza, como MaskGIT, 4.67 (Tabla 2; menor es mejor). No prueba "uno y luego sus
vecinos", no escribe un modelo BIM (los autores limitan su "listo para BIM/CAD" a polígonos de cuartos) y no mide
novedad contra el entrenamiento. Su referencia MaskPLAN, del mismo grupo, merece una búsqueda propia.

## Límites de esta búsqueda

- Fuentes: OpenAlex (≈755 resultados revisados en 4 ángulos), la API de arXiv (casi inútil: redirección de http a
  https y luego límite de peticiones 429 con cuatro scouts en paralelo), Crossref solo para confirmar datos. No se usaron
  Semantic Scholar, Google Scholar ni CumInCAD.
- 23 tarjetas: 17 aceptadas, 2 en duda, 4 rechazadas por los validadores.
- Cerrados o bloqueados: ScienceDirect, ACM y MDPI (403), ETH Research Collection (429/500), mediaTUM (verificación
  anti-bots). Dos artículos de Automation in Construction 2026 sobre aprendizaje autosupervisado en BIM
  (10.1016/j.autcon.2026.107075 y 10.1016/j.autcon.2026.107169) no tienen copia abierta registrada; vale la pena
  pedirlos por la biblioteca.
- Pendiente para el autor en CumInCAD: `masked BIM`, `BIM completion`, `floor plan masked`, `graph masked autoencoder
  architecture`, `generation order layout`, `novelty generative design evaluation`.
