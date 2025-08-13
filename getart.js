// Museum Art Browser Extension - Refactored
class MuseumArtApp {
    constructor() {
        this.museums = {
            wht: new WhitneyMuseum(),
            aic: new ArtInstituteChicago(),
            cma: new ClevelandMuseum(),
            met: new MetropolitanMuseum()
        };
        
        // Currently only Whitney is active
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

    init() {
        $(document).ready(() => {
            this.loadRandomArtwork();
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
            is_public_domain
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
            is_public_domain
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
        
        // Public domain notice
        if (data.is_public_domain) {
            const objPublicDomainContainer = $('<p class="objectPublicDomainContainer"></p>');
            objPublicDomainContainer.html('<span class="description">This object is in the public domain.</span>');
            objPublicDomainContainer.appendTo(container);
        }
        
        // Add history details inside the caption container
        this.createHistoryDetailsInCaption(container);
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

        const detailsElement = $('<details class="viewHistory"><summary>Last 10 Viewed Artworks (' + this.viewHistory.length + ')</summary></details>');
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

        return {
            imgPath: data.data?.attributes?.images?.[0]?.url || '',
            artistCulture: artistName,
            title: data.data?.attributes?.title || '',
            nationality: '',
            objectDate: data.data?.attributes?.display_date || '',
            objectURL: data.data?.attributes?.tms_id 
                ? `https://whitney.org/collection/works/${data.data.attributes.tms_id}` 
                : '',
            description: data.data?.attributes?.description || '',
            museumName: this.museum,
            docs: this.docs,
            is_public_domain: false,
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
        };
    }
}

// Initialize the application
const museumApp = new MuseumArtApp();