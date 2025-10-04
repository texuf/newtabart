// Museum Art Browser Extension - Refactored with Postcard Feature
class MuseumArtApp {
    constructor() {
        this.museums = {
            wht: new WhitneyMuseum(),
            aic: new ArtInstituteChicago(),
            cma: new ClevelandMuseum(),
            met: new MetropolitanMuseum(),
            wmc: new WikimediaCommons()
        };
        
        // Initialize with default museums (will be updated by loadSettings)
        this.activeMuseums = {
            wht: this.museums.wht,
            aic: this.museums.aic,
            cma: this.museums.cma,
            met: this.museums.met
        };
        
        // Track viewing history (last 10 items)
        this.maxHistoryItems = 10;
        this.storageKey = 'museumArtHistory';
        
        // Load existing history from storage
        this.loadHistory();
        
        this.init();
    }

    async init() {
        // Wait for settings to load before displaying artwork
        await this.loadSettings();
        
        $(document).ready(() => {
            this.loadRandomArtwork();
        });
    }

    async loadSettings() {
        return new Promise((resolve) => {
            const defaultSettings = {
                enableWhitney: true,
                enableAIC: true,
                enableCleveland: true,
                enableMet: true,
                enableWikimedia: false
            };

            chrome.storage.local.get(defaultSettings, (result) => {
                this.activeMuseums = {};
                
                if (result.enableWhitney) {
                    this.activeMuseums.wht = this.museums.wht;
                }
                if (result.enableAIC) {
                    this.activeMuseums.aic = this.museums.aic;
                }
                if (result.enableCleveland) {
                    this.activeMuseums.cma = this.museums.cma;
                }
                if (result.enableMet) {
                    this.activeMuseums.met = this.museums.met;
                }
                if (result.enableWikimedia) {
                    this.activeMuseums.wmc = this.museums.wmc;
                }
                
                resolve();
            });
        });
    }
    getRandomMuseum() {
        const keys = Object.keys(this.activeMuseums);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return this.activeMuseums[randomKey];
    }

    async loadRandomArtwork() {
        const museum = this.getRandomMuseum();
        
        try {
            const artworkData = await this.fetchRandomArtwork(museum);
            
            if (!artworkData || !artworkData.imgPath) {
                // Retry if no image found
                return this.loadRandomArtwork();
            }
            
            this.displayArtwork(artworkData);
            
        } catch (error) {
            console.error('Error loading artwork:', error);
            // Retry on error
            this.loadRandomArtwork();
        }
    }

    async fetchRandomArtwork(museum) {
        const url = museum.getRandomUrl();
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return await museum.formatData(data);
            
        } catch (error) {
            console.error(`Error fetching from ${museum.museum}:`, error);
            throw error;
        }
    }

    displayArtwork(data) {
        const {
            imgPath,
            artistCulture,
            title,
            objectDate,
            nationality,
            culture,
            objectURL,
            description,
            museumName,
            docs,
            is_public_domain,
            museumShortcode,
            objectId
        } = data;

        // Add to viewing history
        this.addToHistory(data);

        // Clear previous content
        $('#objectContainer').empty();

        // Build the display elements
        const objectLink = $('<div class="objectLink">');
        
        // Image container
        const imgContainer = $('<div class="imgContainer">');
        this.loadImage(imgPath, imgContainer);
        imgContainer.appendTo(objectLink);

        // Caption container
        const captionContainer = $('<div class="captionContainer">');
        this.buildCaption(captionContainer, {
            title: this.formatTitle(title, objectDate),
            artist: artistCulture || culture,
            nationality,
            objectURL,
            objectDate,
            description,
            museumName,
            docs,
            is_public_domain,
            museumShortcode,
            objectId
        });
        
        captionContainer.appendTo(objectLink);
        objectLink.appendTo('#objectContainer');
    }

    loadImage(imgPath, container) {
        // Preload image
        const img = new Image();
        img.onload = () => {
            $(`<img src="${imgPath}" style="display: none;">`)
                .appendTo(container)
                .fadeIn(1000);
        };
        img.src = imgPath;
    }

    formatTitle(title, objectDate) {
        return objectDate ? `${title}, ` : title;
    }

    buildCaption(container, data) {
        // Title and date
        const topLine = $('<p class="topLine"><span class="title">'+data.title+'</span><span class="date">'+(data.objectDate || '')+'</span></p>').appendTo(container);

        // Artist and nationality
        const bottomLine = $('<p><span class="artist">'+data.artist+'</span> <span class="nationality">'+data.nationality+'</span></p>').appendTo(container);

        // Source link
        $('<p class="sourceLinkContainer"><a class="sourceLink" href="'+data.objectURL+'">'+data.objectURL+'</a></p>').appendTo(container);

        // Description if available
        if (data.description) {
            const objDescContainer = $('<p class="objectDescriptionContainer"></p>');
            const objDescSpan = $('<span class="objectDescription"></span>');
            objDescSpan.html(data.description);
            objDescSpan.appendTo(objDescContainer);
            objDescContainer.appendTo(container);
        }

        // Museum credit
        const description = $('<p class="descriptionContainer"><span class="description">This artwork is sourced from the <a href="'+data.docs+'">'+data.museumName+' Collection API</a>. This browser extension is not affiliated with the museum. The source code for the extension can be found on <a href="https://github.com/jaymollica/newtabart">github</a>.</span></p>');
        description.appendTo(container);

        // Add spacing before history details
        $('<br/>').appendTo(container);
        
        // Public domain notice and postcard button
        if (data.is_public_domain) {
            const objPublicDomainContainer = $('<p class="objectPublicDomainContainer"></p>');
            objPublicDomainContainer.html('<span class="description">This object is in the public domain.</span>');
            objPublicDomainContainer.appendTo(container);

            // Add postcard button if we have the necessary data
            if (data.museumShortcode && data.objectId) {
                this.createPostcardButton(container, data.museumShortcode, data.objectId);
            }
        }
        
        // Add history details inside the caption container
        this.createHistoryDetailsInCaption(container);
    }

    createPostcardButton(container, museumShortcode, objectId) {
        const postcardContainer = $('<p class="postcardContainer"></p>');
        const postcardButton = $('<button class="postcardButton">Create Postcard</button>');
        
        postcardButton.on('click', () => {
            const postcardUrl = `https://sweetpost.art/?museum=${museumShortcode}&object_id=${objectId}`;
            window.open(postcardUrl, '_blank');
        });
        
        postcardButton.appendTo(postcardContainer);
        postcardContainer.appendTo(container);
    }

    addToHistory(data) {
        // Create a simplified history item
        const historyItem = {
            title: data.title,
            artist: data.artistCulture || data.culture,
            museum: data.museumName,
            objectURL: data.objectURL,
            timestamp: new Date().toLocaleString(),
            is_public_domain: data.is_public_domain
        };

        // Remove duplicate if it already exists (same objectURL)
        this.viewHistory = this.viewHistory.filter(item => item.objectURL !== historyItem.objectURL);

        // Add to beginning of array
        this.viewHistory.unshift(historyItem);

        // Keep only the last 10 items
        if (this.viewHistory.length > this.maxHistoryItems) {
            this.viewHistory = this.viewHistory.slice(0, this.maxHistoryItems);
        }

        // Save to browser storage
        this.saveHistory();
    }

    loadHistory() {
        try {
            // Try to use browser extension storage if available
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get([this.storageKey], (result) => {
                    this.viewHistory = result[this.storageKey] || [];
                });
            } else {
                // Fallback to localStorage for testing/development
                const saved = localStorage.getItem(this.storageKey);
                this.viewHistory = saved ? JSON.parse(saved) : [];
            }
        } catch (error) {
            console.error('Error loading history from storage:', error);
            this.viewHistory = [];
        }
    }

    saveHistory() {
        try {
            // Try to use browser extension storage if available
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const data = {};
                data[this.storageKey] = this.viewHistory;
                chrome.storage.local.set(data);
            } else {
                // Fallback to localStorage for testing/development
                localStorage.setItem(this.storageKey, JSON.stringify(this.viewHistory));
            }
        } catch (error) {
            console.error('Error saving history to storage:', error);
        }
    }

    createHistoryDetailsInCaption(container) {
        if (this.viewHistory.length === 0) return;

        const detailsElement = $('<details class="viewHistory"><summary>Recently viewed artworks</summary></details>');
        const historyList = $('<ul class="historyList"></ul>');

        this.viewHistory.forEach((item, index) => {
            const listItem = $('<li class="historyItem"></li>');
            
            const artworkLink = $('<a href="' + item.objectURL + '" target="_blank" rel="noopener"></a>');
            const titleSpan = $('<span class="historyTitle">' + item.title + '</span>');
            const artistSpan = $('<span class="historyArtist"> by ' + (item.artist || 'Unknown Artist') + '</span>');
            const museumSpan = $('<span class="historyMuseum"> - ' + item.museum + '</span>');
            const timeSpan = $('<span class="historyTime"> (' + item.timestamp + ')</span>');
            
            artworkLink.append(titleSpan, artistSpan, museumSpan);
            
            // Add public domain indicator if applicable
            if (item.is_public_domain) {
                const publicDomainSpan = $('<span class="historyPublicDomain"> [Public Domain]</span>');
                artworkLink.append(publicDomainSpan);
            }
            
            artworkLink.append(timeSpan);
            listItem.append(artworkLink);
            historyList.append(listItem);
        });

        detailsElement.append(historyList);
        detailsElement.appendTo(container);
    }
}

// Base Museum class
class Museum {
    constructor(config) {
        Object.assign(this, config);
    }

    getRandomUrl() {
        throw new Error('getRandomUrl must be implemented by subclass');
    }

    async formatData(data) {
        throw new Error('formatData must be implemented by subclass');
    }
}

// Natural History Museum London implementation
class NaturalHistoryMuseumLondon extends Museum {
    constructor() {
        super({
            museum: "Natural History Museum, London",
            shortname: "nhm",
            endPoint: "https://data.nhm.ac.uk/api/3/action/datastore_search",
            docs: "https://data.nhm.ac.uk/about/download",
            maxInt: "100000" // They have millions of records
        });
        
        // Resource IDs for different types of visual collections
        // These are some known datasets that contain images
        this.visualResources = [
            '05ff2255-c38a-40c9-b657-4ccb55ab2feb', // Specimens with images
            '51e7a60c-cbda-4e88-8a68-ef93442643e6', // Herbarium specimens
            '2e126baa-b256-4a3d-8659-483ce5a02e80', // Historical collections
            '8c8314e9-98ce-479e-b87d-9eeb96604dbe'  // Clayton Herbarium
        ];
    }

    getRandomUrl() {
        // Pick a random resource that likely contains images
        const randomResourceId = this.visualResources[Math.floor(Math.random() * this.visualResources.length)];
        
        // Random offset to get different results
        const randomOffset = Math.floor(Math.random() * 1000);
        
        // Search for records with images
        return `${this.endPoint}?resource_id=${randomResourceId}&limit=10&offset=${randomOffset}`;
    }

    async formatData(data) {
        try {
            if (!data.result || !data.result.records || data.result.records.length === 0) {
                return { imgPath: '' };
            }

            // Filter records that have image data
            const recordsWithImages = data.result.records.filter(record => {
                return record.Image || record.image || record.ImageURL || record.image_url || 
                       record._image_field || record.photo || record.photograph ||
                       (record.format && record.format.toLowerCase().includes('jpg')) ||
                       (record.format && record.format.toLowerCase().includes('png'));
            });

            if (recordsWithImages.length === 0) {
                return { imgPath: '' };
            }

            // Pick a random record with images
            const randomRecord = recordsWithImages[Math.floor(Math.random() * recordsWithImages.length)];
            
            // Extract data from the record
            let title = randomRecord.Species || randomRecord.species || 
                       randomRecord.ScientificName || randomRecord.scientific_name ||
                       randomRecord.CommonName || randomRecord.common_name ||
                       randomRecord.Title || randomRecord.title ||
                       randomRecord.Name || randomRecord.name ||
                       randomRecord.Barcode || randomRecord.barcode ||
                       'Natural History Specimen';

            let artist = randomRecord.Collector || randomRecord.collector ||
                        randomRecord.Author || randomRecord.author ||
                        randomRecord.Determiner || randomRecord.determiner ||
                        randomRecord.IdentifiedBy || randomRecord.identified_by ||
                        'Natural History Museum Collection';

            let date = randomRecord.DateCollected || randomRecord.date_collected ||
                      randomRecord.Date || randomRecord.date ||
                      randomRecord.Year || randomRecord.year ||
                      randomRecord.CollectionDate || randomRecord.collection_date ||
                      '';

            // Try to find the image URL
            let imageUrl = randomRecord.Image || randomRecord.image || 
                          randomRecord.ImageURL || randomRecord.image_url ||
                          randomRecord.photo || randomRecord.photograph ||
                          '';

            // If no direct image URL, try to construct one from available data
            if (!imageUrl && randomRecord._image_field) {
                imageUrl = randomRecord[randomRecord._image_field];
            }

            // Some records may have relative URLs that need the base domain
            if (imageUrl && imageUrl.startsWith('/')) {
                imageUrl = `https://data.nhm.ac.uk${imageUrl}`;
            }

            // Extract location/geography info for nationality field
            let location = randomRecord.Country || randomRecord.country ||
                          randomRecord.Location || randomRecord.location ||
                          randomRecord.Locality || randomRecord.locality ||
                          randomRecord.Geography || randomRecord.geography ||
                          '';

            // Build description from available scientific data
            let description = '';
            const descFields = [
                randomRecord.Description || randomRecord.description,
                randomRecord.Notes || randomRecord.notes,
                randomRecord.Habitat || randomRecord.habitat,
                randomRecord.Family || randomRecord.family,
                randomRecord.Order || randomRecord.order,
                randomRecord.Class || randomRecord.class
            ].filter(field => field && field.trim().length > 0);
            
            if (descFields.length > 0) {
                description = descFields.join(' • ');
            }

            // Create a unique object URL
            const objectId = randomRecord.Barcode || randomRecord.barcode ||
                           randomRecord.CatalogueNumber || randomRecord.catalogue_number ||
                           randomRecord.ID || randomRecord.id ||
                           Math.random().toString(36).substr(2, 9);

            const objectURL = `https://data.nhm.ac.uk/object/${objectId}`;

            // Most scientific collections are public domain or have open licenses
            const isPublicDomain = true;

            return {
                imgPath: imageUrl,
                artistCulture: artist,
                title: title,
                nationality: location,
                objectDate: date,
                objectURL: objectURL,
                culture: location,
                description: description,
                museumName: this.museum,
                docs: this.docs,
                is_public_domain: isPublicDomain,
                museumShortcode: this.shortname,
                objectId: objectId
            };

        } catch (error) {
            console.error('Error formatting Natural History Museum data:', error);
            return { imgPath: '' };
        }
    }
}

// Whitney Museum implementation
class WhitneyMuseum extends Museum {
    constructor() {
        super({
            museum: "Whitney Museum",
            shortname: "wht",
            endPoint: "https://whitney.org/api/artworks/",
            docs: "https://whitney.org/about/website/api",
            maxInt: "27254",
            maxPage: "909"
        });
    }

    getRandomUrl() {
        const randInt = Math.floor(Math.random() * this.maxPage);
        return `${this.endPoint}${randInt}`;
    }

    async formatData(data) {
        let artistName = '';
        
        // Get artist data if available
        if (data.data?.relationships?.artists?.data?.length > 0) {
            const artistId = data.data.relationships.artists.data[0].id;
            artistName = await this.getArtist(artistId);
        }

        // Extract object ID from TMS ID for postcard feature
        const objectId = data.data?.attributes?.tms_id || '';

        return {
            imgPath: data.data?.attributes?.images?.[0]?.url || '',
            artistCulture: artistName,
            title: data.data?.attributes?.title || '',
            nationality: '',
            objectDate: data.data?.attributes?.display_date || '',
            objectURL: objectId 
                ? `https://whitney.org/collection/works/${objectId}` 
                : '',
            description: data.data?.attributes?.object_label || '',
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: false,
            museumShortcode: this.shortname,
            objectId: objectId
        };
    }

    async getArtist(id) {
        try {
            const response = await fetch(`https://whitney.org/api/artists/${id}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            return data.data?.attributes?.display_name || '';
        } catch (error) {
            console.error(`Error fetching artist ${id}:`, error);
            return '';
        }
    }
}

// Art Institute of Chicago implementation
class ArtInstituteChicago extends Museum {
    constructor() {
        super({
            museum: "Art Institute of Chicago",
            shortname: "aic",
            endPoint: "https://api.artic.edu/api/v1/artworks/",
            docs: "https://api.artic.edu/docs/",
            maxInt: "125841",
            maxPage: "10487"
        });
    }

    getRandomUrl() {
        const randInt = Math.floor(Math.random() * this.maxInt);
        return `${this.endPoint}?limit=1&page=${randInt}`;
    }

    async formatData(data) {
        if (!data.data || data.data.length === 0) {
            return { imgPath: '' };
        }

        const artwork = data.data[0];
        let imgUrl = '';

        if (artwork.image_id) {
            const imgBaseUrl = data.config.iiif_url;
            imgUrl = `${imgBaseUrl}/${artwork.image_id}/full/843,/0/default.jpg`;
        }

        return {
            imgPath: imgUrl,
            artistCulture: artwork.artist_display || '',
            title: artwork.title || '',
            nationality: artwork.place_of_origin || '',
            objectDate: artwork.date_display || '',
            objectURL: `https://www.artic.edu/artworks/${artwork.id}`,
            culture: artwork.category_titles || '',
            description: artwork.description || '',
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: artwork.is_public_domain || false,
            museumShortcode: this.shortname,
            objectId: artwork.id
        };
    }
}

// Cleveland Museum implementation
class ClevelandMuseum extends Museum {
    constructor() {
        super({
            museum: "Cleveland Museum of Art",
            shortname: "cma",
            endPoint: "https://openaccess-api.clevelandart.org/api/artworks/",
            docs: "https://openaccess-api.clevelandart.org/",
            maxInt: "29144"
        });
    }

    getRandomUrl() {
        const randInt = Math.floor(Math.random() * this.maxInt);
        return `${this.endPoint}?has_image=1&limit=1&skip=${randInt}`;
    }

    async formatData(data) {
        if (!data.data || data.data.length === 0) {
            return { imgPath: '' };
        }

        const artwork = data.data[0];
        const wallDescription = artwork.wall_description === 'null' ? '' : artwork.wall_description;
        const artist = artwork.creators?.length > 0 ? artwork.creators[0].description : '';
        const isPublicDomain = artwork.share_license_status === 'CC0';

        return {
            imgPath: artwork.images?.web?.url || '',
            artistCulture: artist,
            title: artwork.title || '',
            nationality: artwork.artistNationality || '',
            objectDate: artwork.creation_date || '',
            objectURL: artwork.url || '',
            culture: artwork.culture?.[0] || '',
            description: wallDescription,
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: isPublicDomain,
            museumShortcode: this.shortname,
            objectId: artwork.id
        };
    }
}

// Metropolitan Museum implementation
class MetropolitanMuseum extends Museum {
    constructor() {
        super({
            museum: "Metropolitan Museum of Art",
            shortname: "met",
            endPoint: "https://collectionapi.metmuseum.org/public/collection/v1/objects/",
            docs: "https://metmuseum.github.io/",
            maxInt: "471581"
        });
    }

    getRandomUrl() {
        const randInt = Math.floor(Math.random() * this.maxInt);
        return `${this.endPoint}${randInt}`;
    }

    async formatData(data) {
        return {
            imgPath: data.primaryImageSmall || '',
            artistCulture: data.artistDisplayName || '',
            title: data.title || '',
            nationality: data.artistNationality || '',
            objectDate: data.objectDate || '',
            objectURL: data.objectURL || '',
            culture: data.culture || '',
            description: data.wall_description || '',
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: data.isPublicDomain || false,
            museumShortcode: this.shortname,
            objectId: data.objectID
        };
    }
}

// Wikimedia Commons implementation
class WikimediaCommons extends Museum {
    constructor() {
        super({
            museum: "Wikimedia Commons",
            shortname: "wmc",
            endPoint: "https://commons.wikimedia.org/w/api.php",
            docs: "https://commons.wikimedia.org/wiki/Commons:API",
            searchTerms: [
                'painting oil canvas',
                'sculpture marble bronze',
                'renaissance art',
                'impressionist painting',
                'portrait painting',
                'landscape painting',
                'ancient sculpture',
                'modern art',
                'classical art',
                'baroque painting'
            ]
        });
    }

    getRandomUrl() {
        const searchTerm = this.searchTerms[Math.floor(Math.random() * this.searchTerms.length)];
        const offset = Math.floor(Math.random() * 100);
        
        // Use search instead of category - this gets actual images
        const url = `${this.endPoint}?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchTerm)}&gsrlimit=50&gsroffset=${offset}&prop=imageinfo&iiprop=url|extmetadata|size&origin=*`;
        console.log('Wikimedia URL:', url);
        return url;
    }

    async formatData(data) {
        console.log('Wikimedia raw data:', data);
        
        try {
            if (!data.query || !data.query.pages) {
                console.log('No query/pages in Wikimedia response');
                return { imgPath: '' };
            }

            const pages = Object.values(data.query.pages);
            console.log('Total pages:', pages.length);
            
            const imagesOnly = pages.filter(page => {
                if (!page.imageinfo || !page.imageinfo[0]) return false;
                const info = page.imageinfo[0];
                
                // Filter for actual image files with reasonable dimensions
                const hasUrl = info.url;
                const isImageType = info.url && info.url.match(/\.(jpg|jpeg|png)$/i);
                const hasSize = info.width && info.height;
                const goodSize = info.width >= 400 && info.height >= 400; // Min dimensions
                const notTooBig = info.width <= 5000 && info.height <= 5000; // Max dimensions
                
                return hasUrl && isImageType && hasSize && goodSize && notTooBig;
            });

            console.log('Images filtered:', imagesOnly.length);

            if (imagesOnly.length === 0) {
                console.log('No valid images found, retrying...');
                return { imgPath: '' };
            }

            const randomPage = imagesOnly[Math.floor(Math.random() * imagesOnly.length)];
            const imageInfo = randomPage.imageinfo[0];
            const metadata = imageInfo.extmetadata || {};

            console.log('Selected image:', imageInfo.url);

            // Clean HTML from metadata
            const stripHtml = (html) => {
                if (!html) return '';
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                return tmp.textContent || tmp.innerText || '';
            };

            const title = stripHtml(metadata.ObjectName?.value) || 
                        stripHtml(metadata.ImageDescription?.value) || 
                        randomPage.title.replace('File:', '').replace(/\.(jpg|jpeg|png)$/i, '');
            
            const artist = stripHtml(metadata.Artist?.value) || 
                        stripHtml(metadata.Credit?.value) || 
                        'Unknown';
            
            const date = stripHtml(metadata.DateTimeOriginal?.value) || 
                        stripHtml(metadata.DateTime?.value) || '';

            const description = stripHtml(metadata.ImageDescription?.value) || '';

            // Extract filename from the title (it's in format "File:filename.jpg")
            const filename = randomPage.title.replace('File:', '');

            // Check license - only mark as public domain if it truly is
            const licenseShortName = metadata.LicenseShortName?.value || '';
            const licenseUrl = metadata.LicenseUrl?.value || '';
            
            // Public domain and compatible licenses
            const publicDomainLicenses = [
                'CC0',
                'Public domain',
                'PD',
                'PDM', // Public Domain Mark
            ];
            
            const isPublicDomain = publicDomainLicenses.some(license => 
                licenseShortName.includes(license) || licenseUrl.includes('publicdomain')
            );

            console.log('License:', licenseShortName, 'Is PD:', isPublicDomain);

            return {
                imgPath: imageInfo.url,
                artistCulture: artist.substring(0, 200), // Limit length
                title: title.substring(0, 200),
                nationality: '',
                objectDate: date,
                objectURL: imageInfo.descriptionurl,
                culture: '',
                description: description.substring(0, 300),
                museumName: this.museum,
                docs: this.docs,
                is_public_domain: isPublicDomain,
                museumShortcode: this.shortname,
                objectId: filename
            };

        } catch (error) {
            console.error('Error formatting Wikimedia Commons data:', error);
            return { imgPath: '' };
        }
    }
}

// Initialize the application
const museumApp = new MuseumArtApp();