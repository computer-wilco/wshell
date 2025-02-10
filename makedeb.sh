#!/bin/bash

# Variabelen instellen
PACKAGE_NAME="wshell"        # Naam van het pakket
VERSION="1.0.0"              # Versie van het pakket
ARCHITECTURE="amd64"         # Architectuur van het pakket (bv. amd64 of i386)
PACKAGE_DIR="package"        # Tijdelijke directory voor de pakketstructuur
SOURCE_DIR="dist/linux-unpacked" # Directory met de bestanden van de app
EXECUTABLE="wshell"          # Naam van het uitvoerbare bestand
ICON="icons/png/512x512.png" # Naam van het icoonbestand
ICON_NAME="wshell.png"       # Naam van het icoon
DIST_DIR="dist"              # Dist-map

# 1. Opruimen van eerdere pogingen
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR/DEBIAN
mkdir -p $PACKAGE_DIR/usr/local/lib/$PACKAGE_NAME
mkdir -p $PACKAGE_DIR/usr/share/applications/  # Voor het .desktop-bestand
mkdir -p $PACKAGE_DIR/usr/share/icons/hicolor/512x512/apps/  # Voor het icoon

# 2. Control-bestand maken met pakketgegevens
cat <<EOF > $PACKAGE_DIR/DEBIAN/control
Package: $PACKAGE_NAME
Version: $VERSION
Section: normal
Priority: optional
Architecture: $ARCHITECTURE
Maintainer: Wilco Joosen <wilcowebsite@hotmail.com>
Description: De WShell terminal
EOF

# 3. Post-install en post-remove script maken
cat <<EOF > $PACKAGE_DIR/DEBIAN/postinst
#!/bin/sh

set -e

# Maak een symlink aan voor het spel in /usr/bin
ln -s /usr/local/lib/$PACKAGE_NAME/$EXECUTABLE /usr/bin/$EXECUTABLE

# Update desktop database cache
update-desktop-database /usr/share/applications

# Exit met succes
exit 0
EOF

cat <<EOF > $PACKAGE_DIR/DEBIAN/postrm
#!/bin/sh
set -e

# Verwijder de symlink
rm /usr/bin/$EXECUTABLE

# Update desktop database cache
update-desktop-database /usr/share/applications

exit 0
EOF

chmod +x $PACKAGE_DIR/DEBIAN/postinst
chmod +x $PACKAGE_DIR/DEBIAN/postrm

# 4. Kopieer de app-bestanden naar de juiste map (/usr/local/lib)
cp -r $SOURCE_DIR/* $PACKAGE_DIR/usr/local/lib/$PACKAGE_NAME

# 5. Maak een .desktop-bestand aan voor het menu
cat <<EOF > $PACKAGE_DIR/usr/share/applications/$PACKAGE_NAME.desktop
[Desktop Entry]
Version=$VERSION
Type=Application
Name=WShell
Comment=Geweldige WShell terminal
Exec=/usr/bin/$EXECUTABLE
Icon=/usr/share/icons/hicolor/512x512/apps/$ICON_NAME
Terminal=true
Categories=Normal;
EOF

# 6. Kopieer het icoon naar de juiste locatie
cp $ICON $PACKAGE_DIR/usr/share/icons/hicolor/512x512/apps/$ICON_NAME

# 7. Pakket maken
dpkg-deb --build $PACKAGE_DIR

# 8. Verplaats het .deb-bestand naar de huidige map en hernoem het
mv $PACKAGE_DIR.deb ${DIST_DIR}/${PACKAGE_NAME}_${VERSION}_${ARCHITECTURE}.deb

# 9. Opruimen
rm -r $PACKAGE_DIR

echo "Pakket ${DIST_DIR}/${PACKAGE_NAME}_${VERSION}_${ARCHITECTURE}.deb is succesvol aangemaakt!"
