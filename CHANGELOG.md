# Changelog

## 1.0.1

### English

**Fixed**
- Curly quotes, dashes and accents showed up as `â€œ`. Text is now read correctly.
- Some files that store text unencoded damaged those characters beyond repair. Fixed.
- Images embedded with the old `cid:` link style appeared broken. They show now.
- The last part of a file was lost when the closing marker was missing. It is now read in full.
- Style sheets with accents displayed badly. Fixed.
- Large pages opened slowly. They now load faster.

**Security**
- A saved page can no longer run programs inside the viewer. It is shown in a locked box.
- A saved page no longer connects to the internet. Only what is stored inside the file is shown.
- A saved page can no longer send the viewer to another website on its own (automatic redirects are removed), and it cannot submit forms.
- The extension asks for one permission less (`activeTab`).

**Things you may notice**
- Pages that needed their own JavaScript (menus, tabs) look simpler.
- Anything not stored inside the file is left empty instead of being downloaded.

### Español

**Corregido**
- Las comillas, rayas y acentos salían como `â€œ`. Ahora el texto se lee bien.
- Algunos archivos que guardan el texto sin codificar dañaban esos caracteres sin remedio. Arreglado.
- Las imágenes incrustadas con el enlace antiguo `cid:` salían rotas. Ahora se ven.
- Se perdía la última parte de un archivo si faltaba la marca de cierre. Ahora se lee completo.
- Las hojas de estilo con acentos se veían mal. Arreglado.
- Las páginas grandes abrían lento. Ahora cargan más rápido.

**Seguridad**
- Una página guardada ya no puede ejecutar programas dentro del visor. Se muestra en una caja cerrada.
- Una página guardada ya no se conecta a internet. Solo se muestra lo que viene guardado en el archivo.
- Una página guardada ya no puede mandar el visor a otro sitio web por su cuenta (se eliminan las redirecciones automáticas) ni enviar formularios.
- La extensión pide un permiso menos (`activeTab`).

**Lo que puedes notar**
- Las páginas que necesitaban su propio JavaScript (menús, pestañas) se ven más simples.
- Lo que no venga guardado dentro del archivo queda vacío en lugar de descargarse.
