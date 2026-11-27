import { isRobotsBody, isRobotsLocation } from './marketplace.gateway';

describe('observed marketplace robots responses', () => {
  it('follows Texnomart policy CDN but rejects other cross-origin policy locations', () => {
    expect(
      isRobotsLocation(
        'texnomart',
        new URL(
          'https://mini-io-api.texnomart.uz/newcontent/seo-file/robots.txt',
        ),
      ),
    ).toBe(true);
    expect(
      isRobotsLocation(
        'texnomart',
        new URL('https://mini-io-api.texnomart.uz/newcontent/other.txt'),
      ),
    ).toBe(false);
    expect(
      isRobotsLocation(
        'upg',
        new URL(
          'https://mini-io-api.texnomart.uz/newcontent/seo-file/robots.txt',
        ),
      ),
    ).toBe(false);
    expect(isRobotsLocation('upg', new URL('https://upg.uz/robots.txt'))).toBe(
      true,
    );
  });

  it('accepts UPG plain policy without a media type and rejects HTML or ambiguous data', () => {
    expect(isRobotsBody('\nUser-Agent: *\nDisallow: /login\n')).toBe(true);
    expect(isRobotsBody('<html>Unavailable</html>')).toBe(false);
    expect(isRobotsBody('Site is unavailable')).toBe(false);
    expect(isRobotsBody('User-Agent: *', 'text/plain; charset=UTF-8')).toBe(
      true,
    );
    expect(isRobotsBody('User-Agent: *', 'text/html')).toBe(false);
  });
});
